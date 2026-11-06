from flask import Blueprint, request, jsonify

from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity
)

from services.auth_service import (
    register_user,
    login_user
)


# ==========================================================
# AUTH BLUEPRINT
# ==========================================================

auth_bp = Blueprint(
    "auth",
    __name__,
    url_prefix="/auth"
)


# ==========================================================
# REGISTER
# POST /auth/register
# ==========================================================

@auth_bp.route("/register", methods=["POST"])
def register():

    try:

        data = request.get_json(silent=True) or {}

        username = data.get("username")
        email = data.get("email")
        password = data.get("password")

        if not username or not email or not password:

            return jsonify({
                "success": False,
                "message": "All fields are required"
            }), 400

        result = register_user(
            username,
            email,
            password
        )

        if not result.get("success"):

            return jsonify({
                "success": False,
                "message": result.get(
                    "message",
                    "Registration failed"
                )
            }), 409

        return jsonify({
            "success": True,
            "message": result.get(
                "message",
                "User registered successfully"
            )
        }), 201

    except Exception as e:

        print(
            "[AUTH REGISTER ROUTE ERROR]",
            repr(e)
        )

        return jsonify({
            "success": False,
            "message": "Registration failed",
            "error": str(e)
        }), 500


# ==========================================================
# LOGIN
# POST /auth/login
# ==========================================================

@auth_bp.route("/login", methods=["POST"])
def login():

    try:

        data = request.get_json(silent=True) or {}

        email = data.get("email")
        password = data.get("password")

        if not email or not password:

            return jsonify({
                "success": False,
                "message": "Email and password are required"
            }), 400

        result = login_user(
            email,
            password
        )

        if not result.get("success"):

            return jsonify({
                "success": False,
                "message": result.get(
                    "message",
                    "Invalid email or password"
                )
            }), 401

        user = result.get("user")

        if not user:

            return jsonify({
                "success": False,
                "message": "User information not found"
            }), 401

        user_id = str(user["_id"])

        username = user.get(
            "username",
            "User"
        )

        role = user.get(
            "role",
            "user"
        )

        # ==================================================
        # CREATE JWT
        # ==================================================

        access_token = create_access_token(
            identity=user_id,
            additional_claims={
                "role": role,
                "username": username
            }
        )

        return jsonify({

            "success": True,

            "message": "Login successful",

            "token": access_token,

            "access_token": access_token,

            "username": username,

            "role": role,

            "user_id": user_id

        }), 200

    except Exception as e:

        print(
            "[AUTH LOGIN ROUTE ERROR]",
            repr(e)
        )

        return jsonify({
            "success": False,
            "message": "Login failed",
            "error": str(e)
        }), 500


# ==========================================================
# PROFILE
# GET /auth/profile
# ==========================================================

@auth_bp.route("/profile", methods=["GET"])
@jwt_required()
def profile():

    try:

        current_user = get_jwt_identity()

        return jsonify({
            "success": True,
            "message": "Profile fetched successfully",
            "user_id": str(current_user)
        }), 200

    except Exception as e:

        print(
            "[AUTH PROFILE ERROR]",
            repr(e)
        )

        return jsonify({
            "success": False,
            "message": "Failed to fetch profile",
            "error": str(e)
        }), 500