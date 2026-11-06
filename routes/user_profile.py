from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from bson import ObjectId

from database.mongodb import users_collection


profile_bp = Blueprint(
    "profile",
    __name__,
    url_prefix="/profile"
)


# ==========================================
# Helper: Get Current User
# ==========================================
def get_current_user():
    identity = get_jwt_identity()

    try:
        user = users_collection.find_one({
            "_id": ObjectId(identity)
        })
    except Exception:
        user = users_collection.find_one({
            "_id": identity
        })

    return user


# ==========================================
# GET PROFILE
# ==========================================
@profile_bp.route("", methods=["GET"])
@jwt_required()
def get_profile():

    user = get_current_user()

    if not user:
        return jsonify({
            "success": False,
            "message": "User not found"
        }), 404

    return jsonify({
        "success": True,
        "user": {
            "id": str(user["_id"]),
            "username": user.get("username", ""),
            "name": user.get("name", ""),
            "email": user.get("email", ""),
            "role": user.get("role", "user"),
            "created_at": str(user.get("created_at", ""))
        }
    }), 200


# ==========================================
# UPDATE PROFILE
# ==========================================
@profile_bp.route("", methods=["PUT"])
@jwt_required()
def update_profile():

    user = get_current_user()

    if not user:
        return jsonify({
            "success": False,
            "message": "User not found"
        }), 404

    data = request.get_json() or {}

    name = data.get("name", "").strip()
    username = data.get("username", "").strip()
    email = data.get("email", "").strip()

    if not name:
        return jsonify({
            "success": False,
            "message": "Name is required"
        }), 400

    if not username:
        return jsonify({
            "success": False,
            "message": "Username is required"
        }), 400

    if not email:
        return jsonify({
            "success": False,
            "message": "Email is required"
        }), 400

    # Check duplicate username
    existing_username = users_collection.find_one({
        "username": username,
        "_id": {
            "$ne": user["_id"]
        }
    })

    if existing_username:
        return jsonify({
            "success": False,
            "message": "Username already exists"
        }), 409

    # Check duplicate email
    existing_email = users_collection.find_one({
        "email": email,
        "_id": {
            "$ne": user["_id"]
        }
    })

    if existing_email:
        return jsonify({
            "success": False,
            "message": "Email already exists"
        }), 409

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

    return jsonify({
        "success": True,
        "message": "Profile updated successfully"
    }), 200


# ==========================================
# CHANGE PASSWORD
# ==========================================
@profile_bp.route("/password", methods=["PUT"])
@jwt_required()
def change_password():

    user = get_current_user()

    if not user:
        return jsonify({
            "success": False,
            "message": "User not found"
        }), 404

    data = request.get_json() or {}

    current_password = data.get("current_password", "")
    new_password = data.get("new_password", "")

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
            "message": "New password must contain at least 6 characters"
        }), 400

    password_hash = user.get("password")

    if not password_hash:
        return jsonify({
            "success": False,
            "message": "Password information not found"
        }), 500

    if not check_password_hash(
        password_hash,
        current_password
    ):
        return jsonify({
            "success": False,
            "message": "Current password is incorrect"
        }), 401

    new_password_hash = generate_password_hash(
        new_password
    )

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