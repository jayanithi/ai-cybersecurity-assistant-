from werkzeug.security import (
    generate_password_hash,
    check_password_hash
)

from database.mongodb import users_collection


# ==========================================================
# REGISTER USER
# ==========================================================

def register_user(username, email, password):

    try:

        username = str(username or "").strip()
        email = str(email or "").strip().lower()
        password = str(password or "")

        # --------------------------------------------------
        # Validation
        # --------------------------------------------------

        if not username or not email or not password:

            return {
                "success": False,
                "message": "All fields are required"
            }

        # --------------------------------------------------
        # Check Email
        # --------------------------------------------------

        existing_email = users_collection.find_one({
            "email": email
        })

        if existing_email:

            return {
                "success": False,
                "message": "Email already registered"
            }

        # --------------------------------------------------
        # Check Username
        # --------------------------------------------------

        existing_username = users_collection.find_one({
            "username": username
        })

        if existing_username:

            return {
                "success": False,
                "message": "Username already exists"
            }

        # --------------------------------------------------
        # Hash Password
        # --------------------------------------------------

        password_hash = generate_password_hash(
            password
        )

        # --------------------------------------------------
        # Create User
        # --------------------------------------------------

        user = {
            "username": username,
            "email": email,
            "password": password_hash,
            "role": "user"
        }

        result = users_collection.insert_one(user)

        if not result.inserted_id:

            return {
                "success": False,
                "message": "Failed to create user"
            }

        print(
            f"[AUTH] User registered successfully: {email}"
        )

        return {
            "success": True,
            "message": "User registered successfully"
        }

    except Exception as e:

        print(
            "[AUTH REGISTER ERROR]",
            repr(e)
        )

        return {
            "success": False,
            "message": "Registration failed"
        }


# ==========================================================
# LOGIN USER
# ==========================================================

def login_user(email, password):

    try:

        email = str(email or "").strip().lower()
        password = str(password or "")

        # --------------------------------------------------
        # Validation
        # --------------------------------------------------

        if not email or not password:

            return {
                "success": False,
                "message": "Email and password are required"
            }

        print(
            f"[AUTH LOGIN] Searching user: {email}"
        )

        # --------------------------------------------------
        # Find User
        # --------------------------------------------------

        user = users_collection.find_one({
            "email": email
        })

        if not user:

            print(
                f"[AUTH LOGIN] User NOT FOUND: {email}"
            )

            return {
                "success": False,
                "message": "Invalid email or password"
            }

        print(
            f"[AUTH LOGIN] User found: "
            f"{user.get('username', 'Unknown')}"
        )

        # --------------------------------------------------
        # Get Password
        #
        # Support:
        # password
        # password_hash
        # --------------------------------------------------

        stored_password = (
            user.get("password")
            or user.get("password_hash")
        )

        if not stored_password:

            print(
                f"[AUTH LOGIN] Password field missing: {email}"
            )

            return {
                "success": False,
                "message": "Password information not found"
            }

        stored_password = str(stored_password)

        password_valid = False

        # ==================================================
        # CASE 1
        # Werkzeug hashed password
        # ==================================================

        try:

            password_valid = check_password_hash(
                stored_password,
                password
            )

        except Exception as hash_error:

            print(
                "[AUTH LOGIN] Hash verification error:",
                repr(hash_error)
            )

            password_valid = False

        # ==================================================
        # CASE 2
        # Legacy plaintext password
        #
        # If old database contains:
        #
        # "password": "123456"
        #
        # then support it temporarily and immediately
        # convert it into a secure hash.
        # ==================================================

        if not password_valid:

            if stored_password == password:

                print(
                    "[AUTH LOGIN] Legacy plaintext password "
                    "detected. Migrating to hash."
                )

                new_hash = generate_password_hash(
                    password
                )

                users_collection.update_one(
                    {
                        "_id": user["_id"]
                    },
                    {
                        "$set": {
                            "password": new_hash
                        },
                        "$unset": {
                            "password_hash": ""
                        }
                    }
                )

                password_valid = True

        # ==================================================
        # Password Invalid
        # ==================================================

        if not password_valid:

            print(
                f"[AUTH LOGIN] INVALID PASSWORD: {email}"
            )

            return {
                "success": False,
                "message": "Invalid email or password"
            }

        # ==================================================
        # Ensure Role
        # ==================================================

        role = user.get("role")

        if not role:

            role = "user"

            users_collection.update_one(
                {
                    "_id": user["_id"]
                },
                {
                    "$set": {
                        "role": "user"
                    }
                }
            )

            user["role"] = "user"

        # ==================================================
        # LOGIN SUCCESS
        # ==================================================

        print(
            f"[AUTH LOGIN] LOGIN SUCCESS: {email}"
        )

        return {
            "success": True,
            "message": "Login successful",
            "user": user
        }

    except Exception as e:

        print(
            "[AUTH LOGIN ERROR]",
            repr(e)
        )

        return {
            "success": False,
            "message": "Login failed"
        }