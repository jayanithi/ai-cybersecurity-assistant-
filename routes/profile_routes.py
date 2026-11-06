# ==========================================
# PROFILE ROUTES
# ==========================================

import os
import uuid

from flask import (
    Blueprint,
    request,
    jsonify,
    send_from_directory,
    current_app
)

from flask_jwt_extended import (
    jwt_required,
    get_jwt_identity
)

from werkzeug.security import (
    generate_password_hash,
    check_password_hash
)

from werkzeug.utils import secure_filename

from bson import ObjectId

from database.mongodb import users_collection


# ==========================================
# PROFILE BLUEPRINT
# ==========================================

profile_bp = Blueprint(
    "profile",
    __name__,
    url_prefix="/profile"
)


# ==========================================
# PROFILE PICTURE SETTINGS
# ==========================================

ALLOWED_IMAGE_EXTENSIONS = {
    "jpg",
    "jpeg",
    "png",
    "webp"
}

ALLOWED_IMAGE_MIMETYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp"
}

MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB


# ==========================================
# GET PROFILE UPLOAD DIRECTORY
# ==========================================

def get_profile_upload_directory():

    backend_root = os.path.dirname(
        os.path.dirname(
            os.path.abspath(__file__)
        )
    )

    upload_directory = os.path.join(
        backend_root,
        "uploads",
        "profile"
    )

    os.makedirs(
        upload_directory,
        exist_ok=True
    )

    return upload_directory


# ==========================================
# CHECK ALLOWED EXTENSION
# ==========================================

def allowed_image_extension(filename):

    if not filename:
        return False

    if "." not in filename:
        return False

    extension = filename.rsplit(
        ".",
        1
    )[1].lower()

    return extension in ALLOWED_IMAGE_EXTENSIONS


# ==========================================
# GET CURRENT LOGGED-IN USER
# ==========================================

def get_current_user():

    identity = get_jwt_identity()

    user = None

    # ------------------------------------------
    # 1. JWT identity as MongoDB ObjectId
    # ------------------------------------------

    try:

        user = users_collection.find_one(
            {
                "_id": ObjectId(identity)
            }
        )

    except Exception:

        pass

    # ------------------------------------------
    # 2. JWT identity as string ID
    # ------------------------------------------

    if not user:

        user = users_collection.find_one(
            {
                "_id": identity
            }
        )

    # ------------------------------------------
    # 3. JWT identity as email
    # ------------------------------------------

    if not user:

        user = users_collection.find_one(
            {
                "email": identity
            }
        )

    return user


# ==========================================
# BUILD USER RESPONSE
# ==========================================

def serialize_user(user):

    if not user:
        return None

    return {
        "id": str(
            user.get(
                "_id",
                ""
            )
        ),

        "username": user.get(
            "username",
            ""
        ),

        "name": user.get(
            "name",
            ""
        ),

        "email": user.get(
            "email",
            ""
        ),

        "role": user.get(
            "role",
            "user"
        ),

        "joined": str(
            user.get(
                "created_at",
                ""
            )
        ),

        "created_at": str(
            user.get(
                "created_at",
                ""
            )
        ),

        "profile_picture": user.get(
            "profile_picture",
            ""
        )
    }


# ==========================================
# GET PROFILE
# ==========================================

@profile_bp.route(
    "",
    methods=["GET"]
)
@profile_bp.route(
    "/",
    methods=["GET"]
)
@jwt_required()
def get_profile():

    try:

        user = get_current_user()

        if not user:

            return jsonify({
                "success": False,
                "message": "User not found"
            }), 404

        return jsonify({
            "success": True,
            "user": serialize_user(user)
        }), 200

    except Exception as e:

        print(
            "GET PROFILE ERROR:",
            str(e)
        )

        return jsonify({
            "success": False,
            "message": "Failed to load profile"
        }), 500


# ==========================================
# UPDATE PROFILE
# ==========================================

@profile_bp.route(
    "",
    methods=["PUT"]
)
@profile_bp.route(
    "/",
    methods=["PUT"]
)
@jwt_required()
def update_profile():

    try:

        user = get_current_user()

        if not user:

            return jsonify({
                "success": False,
                "message": "User not found"
            }), 404

        # ------------------------------------------
        # Get request data
        # ------------------------------------------

        data = request.get_json(
            silent=True
        ) or {}

        name = str(
            data.get(
                "name",
                ""
            )
        ).strip()

        username = str(
            data.get(
                "username",
                ""
            )
        ).strip()

        email = str(
            data.get(
                "email",
                ""
            )
        ).strip()

        # ==========================================
        # VALIDATION
        # ==========================================

        if not name:

            return jsonify({
                "success": False,
                "message": "Name is required"
            }), 400

        if len(name) < 2:

            return jsonify({
                "success": False,
                "message": "Name must contain at least 2 characters"
            }), 400

        if not username:

            return jsonify({
                "success": False,
                "message": "Username is required"
            }), 400

        if len(username) < 3:

            return jsonify({
                "success": False,
                "message": "Username must contain at least 3 characters"
            }), 400

        if not email:

            return jsonify({
                "success": False,
                "message": "Email is required"
            }), 400

        # ==========================================
        # CHECK USERNAME DUPLICATE
        # ==========================================

        existing_username = users_collection.find_one(
            {
                "username": username,
                "_id": {
                    "$ne": user["_id"]
                }
            }
        )

        if existing_username:

            return jsonify({
                "success": False,
                "message": "Username already exists"
            }), 409

        # ==========================================
        # CHECK EMAIL DUPLICATE
        # ==========================================

        existing_email = users_collection.find_one(
            {
                "email": email,
                "_id": {
                    "$ne": user["_id"]
                }
            }
        )

        if existing_email:

            return jsonify({
                "success": False,
                "message": "Email already exists"
            }), 409

        # ==========================================
        # UPDATE USER
        # ==========================================

        users_collection.update_one(
            {
                "_id": user["_id"]
            },
            {
                "$set": {
                    "name": name,
                    "username": username,
                    "email": email
                }
            }
        )

        # ==========================================
        # GET UPDATED USER
        # ==========================================

        updated_user = users_collection.find_one(
            {
                "_id": user["_id"]
            }
        )

        return jsonify({
            "success": True,
            "message": "Profile updated successfully",
            "user": serialize_user(updated_user)
        }), 200

    except Exception as e:

        print(
            "UPDATE PROFILE ERROR:",
            str(e)
        )

        return jsonify({
            "success": False,
            "message": "Failed to update profile"
        }), 500


# ==========================================
# CHANGE PASSWORD
# ==========================================

@profile_bp.route(
    "/password",
    methods=["PUT"]
)
@jwt_required()
def change_password():

    try:

        user = get_current_user()

        if not user:

            return jsonify({
                "success": False,
                "message": "User not found"
            }), 404

        # ------------------------------------------
        # Get request data
        # ------------------------------------------

        data = request.get_json(
            silent=True
        ) or {}

        current_password = data.get(
            "current_password",
            ""
        )

        new_password = data.get(
            "new_password",
            ""
        )

        # ==========================================
        # VALIDATION
        # ==========================================

        if not current_password:

            return jsonify({
                "success": False,
                "message": "Current password is required"
            }), 400

        if not new_password:

            return jsonify({
                "success": False,
                "message": "New password is required"
            }), 400

        if len(new_password) < 6:

            return jsonify({
                "success": False,
                "message": (
                    "New password must contain "
                    "at least 6 characters"
                )
            }), 400

        # ==========================================
        # GET EXISTING PASSWORD HASH
        # ==========================================

        password_hash = user.get(
            "password"
        )

        if not password_hash:

            return jsonify({
                "success": False,
                "message": "Password information not found"
            }), 500

        # ==========================================
        # CHECK CURRENT PASSWORD
        # ==========================================

        if not check_password_hash(
            password_hash,
            current_password
        ):

            return jsonify({
                "success": False,
                "message": "Current password is incorrect"
            }), 401

        # ==========================================
        # GENERATE NEW PASSWORD HASH
        # ==========================================

        new_password_hash = generate_password_hash(
            new_password
        )

        # ==========================================
        # SAVE NEW PASSWORD
        # ==========================================

        users_collection.update_one(
            {
                "_id": user["_id"]
            },
            {
                "$set": {
                    "password": new_password_hash
                }
            }
        )

        return jsonify({
            "success": True,
            "message": "Password changed successfully"
        }), 200

    except Exception as e:

        print(
            "CHANGE PASSWORD ERROR:",
            str(e)
        )

        return jsonify({
            "success": False,
            "message": "Failed to change password"
        }), 500


# ==========================================
# UPLOAD / CHANGE PROFILE PICTURE
# ==========================================

@profile_bp.route(
    "/picture",
    methods=["PUT"]
)
@jwt_required()
def upload_profile_picture():

    try:

        # ==========================================
        # GET USER
        # ==========================================

        user = get_current_user()

        if not user:

            return jsonify({
                "success": False,
                "message": "User not found"
            }), 404

        # ==========================================
        # GET FILE
        # ==========================================

        profile_image = request.files.get(
            "profile_picture"
        )

        # Support alternate frontend field name
        if not profile_image:

            profile_image = request.files.get(
                "image"
            )

        if not profile_image:

            return jsonify({
                "success": False,
                "message": "Profile picture is required"
            }), 400

        # ==========================================
        # CHECK EMPTY FILE
        # ==========================================

        if not profile_image.filename:

            return jsonify({
                "success": False,
                "message": "Invalid file"
            }), 400

        # ==========================================
        # CHECK FILE SIZE
        # ==========================================

        profile_image.stream.seek(
            0,
            os.SEEK_END
        )

        file_size = profile_image.stream.tell()

        profile_image.stream.seek(
            0
        )

        if file_size > MAX_PROFILE_IMAGE_SIZE:

            return jsonify({
                "success": False,
                "message": "Image size must be less than 5 MB"
            }), 400

        # ==========================================
        # CHECK EXTENSION
        # ==========================================

        original_filename = secure_filename(
            profile_image.filename
        )

        if not allowed_image_extension(
            original_filename
        ):

            return jsonify({
                "success": False,
                "message": (
                    "Only JPG, JPEG, PNG and WEBP "
                    "images are allowed"
                )
            }), 400

        # ==========================================
        # CHECK MIME TYPE
        # ==========================================

        if (
            profile_image.mimetype
            and profile_image.mimetype.lower()
            not in ALLOWED_IMAGE_MIMETYPES
        ):

            return jsonify({
                "success": False,
                "message": "Invalid image format"
            }), 400

        # ==========================================
        # GET EXTENSION
        # ==========================================

        extension = original_filename.rsplit(
            ".",
            1
        )[1].lower()

        # ==========================================
        # CREATE UNIQUE FILE NAME
        # ==========================================

        unique_filename = (
            f"{user['_id']}_"
            f"{uuid.uuid4().hex}."
            f"{extension}"
        )

        upload_directory = (
            get_profile_upload_directory()
        )

        file_path = os.path.join(
            upload_directory,
            unique_filename
        )

        # ==========================================
        # SAVE NEW IMAGE
        # ==========================================

        profile_image.save(
            file_path
        )

        # ==========================================
        # DELETE OLD IMAGE
        # ==========================================

        old_profile_picture = user.get(
            "profile_picture",
            ""
        )

        if old_profile_picture:

            delete_profile_picture_file(
                old_profile_picture
            )

        # ==========================================
        # DATABASE PATH
        # ==========================================

        profile_picture_path = (
            f"/profile/picture/"
            f"{unique_filename}"
        )

        # ==========================================
        # UPDATE MONGODB
        # ==========================================

        users_collection.update_one(
            {
                "_id": user["_id"]
            },
            {
                "$set": {
                    "profile_picture":
                        profile_picture_path
                }
            }
        )

        # ==========================================
        # GET UPDATED USER
        # ==========================================

        updated_user = users_collection.find_one(
            {
                "_id": user["_id"]
            }
        )

        return jsonify({
            "success": True,
            "message": (
                "Profile picture uploaded successfully"
            ),
            "profile_picture":
                profile_picture_path,
            "user":
                serialize_user(updated_user)
        }), 200

    except Exception as e:

        print(
            "UPLOAD PROFILE PICTURE ERROR:",
            str(e)
        )

        return jsonify({
            "success": False,
            "message": (
                "Failed to upload profile picture"
            )
        }), 500


# ==========================================
# REMOVE PROFILE PICTURE
# ==========================================

@profile_bp.route(
    "/picture",
    methods=["DELETE"]
)
@jwt_required()
def remove_profile_picture():

    try:

        # ==========================================
        # GET USER
        # ==========================================

        user = get_current_user()

        if not user:

            return jsonify({
                "success": False,
                "message": "User not found"
            }), 404

        # ==========================================
        # GET CURRENT PICTURE
        # ==========================================

        current_picture = user.get(
            "profile_picture",
            ""
        )

        # ==========================================
        # DELETE PHYSICAL FILE
        # ==========================================

        if current_picture:

            delete_profile_picture_file(
                current_picture
            )

        # ==========================================
        # REMOVE FROM MONGODB
        # ==========================================

        users_collection.update_one(
            {
                "_id": user["_id"]
            },
            {
                "$unset": {
                    "profile_picture": ""
                }
            }
        )

        # ==========================================
        # RESPONSE
        # ==========================================

        return jsonify({
            "success": True,
            "message": (
                "Profile picture removed successfully"
            ),
            "profile_picture": ""
        }), 200

    except Exception as e:

        print(
            "REMOVE PROFILE PICTURE ERROR:",
            str(e)
        )

        return jsonify({
            "success": False,
            "message": (
                "Failed to remove profile picture"
            )
        }), 500


# ==========================================
# DELETE PROFILE PICTURE FILE
# ==========================================

def delete_profile_picture_file(
    profile_picture_path
):

    try:

        if not profile_picture_path:
            return

        # ------------------------------------------
        # Get only filename
        # ------------------------------------------

        filename = os.path.basename(
            profile_picture_path
        )

        if not filename:
            return

        # ------------------------------------------
        # Prevent path traversal
        # ------------------------------------------

        safe_filename = secure_filename(
            filename
        )

        if not safe_filename:
            return

        # ------------------------------------------
        # Build upload path
        # ------------------------------------------

        upload_directory = (
            get_profile_upload_directory()
        )

        file_path = os.path.join(
            upload_directory,
            safe_filename
        )

        # ------------------------------------------
        # Delete file if exists
        # ------------------------------------------

        if os.path.isfile(file_path):

            os.remove(
                file_path
            )

            print(
                "Deleted profile image:",
                safe_filename
            )

    except Exception as e:

        print(
            "DELETE PROFILE IMAGE FILE ERROR:",
            str(e)
        )


# ==========================================
# SERVE PROFILE PICTURE
# ==========================================

@profile_bp.route(
    "/picture/<filename>",
    methods=["GET"]
)
def get_profile_picture(filename):

    try:

        safe_filename = secure_filename(
            filename
        )

        if not safe_filename:

            return jsonify({
                "success": False,
                "message": "Invalid filename"
            }), 400

        upload_directory = (
            get_profile_upload_directory()
        )

        file_path = os.path.join(
            upload_directory,
            safe_filename
        )

        if not os.path.isfile(
            file_path
        ):

            return jsonify({
                "success": False,
                "message": "Profile picture not found"
            }), 404

        return send_from_directory(
            upload_directory,
            safe_filename
        )

    except Exception as e:

        print(
            "SERVE PROFILE PICTURE ERROR:",
            str(e)
        )

        return jsonify({
            "success": False,
            "message": (
                "Failed to load profile picture"
            )
        }), 500