import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import UploadOutlinedIcon from "@mui/icons-material/UploadOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";

import Layout from "../components/Layout";
import API from "../services/api";

/* =========================================================
   DARK THEME COLORS
========================================================= */

const COLORS = {
  primaryText: "#FFFFFF",
  secondaryText: "rgba(255,255,255,0.70)",
  mutedText: "rgba(255,255,255,0.55)",
  icon: "rgba(255,255,255,0.72)",
  iconMuted: "rgba(255,255,255,0.60)",
  cardBackground: "#111827",
  border: "rgba(255,255,255,0.12)",
  inputBorder: "rgba(255,255,255,0.22)",
  inputHoverBorder: "rgba(255,255,255,0.40)",
  primary: "#90caf9",
};

/* =========================================================
   TOKEN
========================================================= */

const getToken = () => {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("token") ||
    ""
  );
};

/* =========================================================
   ERROR MESSAGE
========================================================= */

const getErrorMessage = (
  error,
  fallback = "Something went wrong"
) => {
  const responseData = error?.response?.data;

  if (typeof responseData?.message === "string") {
    return responseData.message;
  }

  if (typeof responseData?.error === "string") {
    return responseData.error;
  }

  if (typeof error?.message === "string") {
    return error.message;
  }

  return fallback;
};

/* =========================================================
   INITIALS
========================================================= */

const getInitials = (name, username) => {
  const value = String(name || username || "U").trim();

  if (!value) {
    return "U";
  }

  const parts = value.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return value.substring(0, 2).toUpperCase();
};

/* =========================================================
   DATE FORMAT
========================================================= */

const formatDate = (dateValue) => {
  if (!dateValue) {
    return "Not available";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return String(dateValue);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* =========================================================
   PROFILE IMAGE URL
========================================================= */

const getProfileImageUrl = (profilePicture) => {
  if (!profilePicture) {
    return "";
  }

  if (
    profilePicture.startsWith("http://") ||
    profilePicture.startsWith("https://") ||
    profilePicture.startsWith("data:")
  ) {
    return profilePicture;
  }

  const baseURL = API?.defaults?.baseURL || "";

  if (!baseURL) {
    return profilePicture;
  }

  /*
    Example:

    API baseURL:
    http://127.0.0.1:5000/api

    Image path:
    /profile/image/abc.jpg

    Result:
    http://127.0.0.1:5000/profile/image/abc.jpg
  */

  const cleanBaseURL = baseURL.replace(/\/api\/?$/, "");

  const cleanPath = profilePicture.startsWith("/")
    ? profilePicture
    : `/${profilePicture}`;

  return `${cleanBaseURL}${cleanPath}`;
};

/* =========================================================
   SYNC PROFILE IMAGE WITH NAVBAR
   Keeps the uploaded image available to Layout/Navbar
   without changing the existing UI.
========================================================= */

const syncProfileImageToStorage = (profilePicture) => {
  try {
    if (!profilePicture) {
      localStorage.removeItem("profile_picture");
      localStorage.removeItem("profilePicture");
      window.dispatchEvent(new Event("profile-updated"));
      return;
    }

    const rawImageUrl = getProfileImageUrl(profilePicture);

    const imageUrl =
      rawImageUrl.startsWith("data:")
        ? rawImageUrl
        : `${rawImageUrl}${
            rawImageUrl.includes("?") ? "&" : "?"
          }v=${Date.now()}`;

    localStorage.setItem("profile_picture", imageUrl);
    localStorage.setItem("profilePicture", imageUrl);

    // Keep common user-object storage in sync when it exists.
    const storedUser =
      localStorage.getItem("user") ||
      sessionStorage.getItem("user");

    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);

        const updatedUser = {
          ...user,
          profile_picture: imageUrl,
          profilePicture: imageUrl,
        };

        localStorage.setItem(
          "user",
          JSON.stringify(updatedUser)
        );

        if (sessionStorage.getItem("user")) {
          sessionStorage.setItem(
            "user",
            JSON.stringify(updatedUser)
          );
        }
      } catch {
        // Ignore invalid old user JSON.
      }
    }

    // Notify Layout/Navbar immediately after upload.
    window.dispatchEvent(new Event("profile-updated"));
  } catch (storageError) {
    console.warn(
      "Profile image storage sync warning:",
      storageError
    );
  }
};

/* =========================================================
   TEXT FIELD DARK MODE STYLE
========================================================= */

const darkTextFieldSx = {
  "& .MuiInputBase-input": {
    color: COLORS.primaryText,
  },

  "& .MuiInputBase-input.Mui-disabled": {
    color: COLORS.primaryText,
    WebkitTextFillColor: COLORS.primaryText,
    opacity: 1,
  },

  "& .MuiInputLabel-root": {
    color: COLORS.secondaryText,
  },

  "& .MuiInputLabel-root.Mui-focused": {
    color: COLORS.primary,
  },

  "& .MuiInputLabel-root.Mui-disabled": {
    color: COLORS.secondaryText,
    opacity: 1,
  },

  "& .MuiOutlinedInput-root": {
    color: COLORS.primaryText,

    "& fieldset": {
      borderColor: COLORS.inputBorder,
    },

    "&:hover fieldset": {
      borderColor: COLORS.inputHoverBorder,
    },

    "&.Mui-focused fieldset": {
      borderColor: COLORS.primary,
    },

    "&.Mui-disabled": {
      color: COLORS.primaryText,

      "& fieldset": {
        borderColor: "rgba(255,255,255,0.14)",
      },
    },
  },

  "& .MuiInputAdornment-root": {
    color: COLORS.icon,
  },

  "& .MuiInputAdornment-root .MuiSvgIcon-root": {
    color: COLORS.icon,
  },

  "& .MuiFormHelperText-root": {
    color: COLORS.mutedText,
  },

  "& .MuiFormHelperText-root.Mui-error": {
    color: "error.main",
  },
};

/* =========================================================
   COMPONENT
========================================================= */

export default function UserProfile() {
  /* =======================================================
     PROFILE
  ======================================================= */

  const [profile, setProfile] = useState(null);

  /* =======================================================
     PROFILE FORM
  ======================================================= */

  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
  });

  const [originalForm, setOriginalForm] = useState({
    name: "",
    username: "",
    email: "",
  });

  /* =======================================================
     PASSWORD
  ======================================================= */

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  /* =======================================================
     PROFILE IMAGE
  ======================================================= */

  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [removingImage, setRemovingImage] = useState(false);

  const fileInputRef = useRef(null);

  /* =======================================================
     UI STATES
  ======================================================= */

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  /* =======================================================
     PASSWORD VISIBILITY
  ======================================================= */

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  /* =======================================================
     ERRORS
  ======================================================= */

  const [fieldErrors, setFieldErrors] = useState({});

  /* =======================================================
     NOTIFICATION
  ======================================================= */

  const [notification, setNotification] = useState({
    open: false,
    severity: "success",
    message: "",
  });

  /* =======================================================
     AUTH CONFIG
  ======================================================= */

  const authConfig = useMemo(() => {
    const token = getToken();

    if (!token) {
      return {};
    }

    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  }, []);

  /* =======================================================
     NOTIFICATION
  ======================================================= */

  const showNotification = (message, severity = "success") => {
    setNotification({
      open: true,
      severity,
      message,
    });
  };

  const closeNotification = () => {
    setNotification((previous) => ({
      ...previous,
      open: false,
    }));
  };

  /* =======================================================
     LOAD PROFILE
  ======================================================= */

  const loadProfile = async () => {
    setLoading(true);

    try {
      const response = await API.get("/profile", authConfig);

      const user =
        response?.data?.user ||
        response?.data?.profile ||
        response?.data;

      if (!user) {
        throw new Error("Profile data not found");
      }

      const normalizedProfile = {
        id: user.id || user._id || "",
        name: user.name || "",
        username: user.username || "",
        email: user.email || "",
        role: user.role || "user",
        created_at:
          user.created_at ||
          user.createdAt ||
          user.joined ||
          "",
        profile_picture:
          user.profile_picture ||
          user.profilePicture ||
          "",
      };

      setProfile(normalizedProfile);

      // Keep Navbar/Layout profile image in sync with MongoDB profile data.
      syncProfileImageToStorage(
        normalizedProfile.profile_picture
      );

      const nextForm = {
        name: normalizedProfile.name,
        username: normalizedProfile.username,
        email: normalizedProfile.email,
      };

      setForm(nextForm);
      setOriginalForm(nextForm);
    } catch (error) {
      console.error("Profile loading error:", error);

      if (error?.response?.status === 401) {
        showNotification(
          "Session expired. Please login again.",
          "error"
        );
      } else {
        showNotification(
          getErrorMessage(error, "Unable to load profile"),
          "error"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    loadProfile();
  }, []);

  /* =======================================================
     CLEAN PREVIEW URL
  ======================================================= */

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  /* =======================================================
     PROFILE FIELD CHANGE
  ======================================================= */

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setFieldErrors((previous) => ({
      ...previous,
      [name]: "",
    }));
  };

  /* =======================================================
     PASSWORD CHANGE
  ======================================================= */

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;

    setPasswordForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setFieldErrors((previous) => ({
      ...previous,
      [name]: "",
    }));
  };

  /* =======================================================
     PROFILE VALIDATION
  ======================================================= */

  const validateProfile = () => {
    const errors = {};

    if (!form.name.trim()) {
      errors.name = "Name is required";
    } else if (form.name.trim().length < 2) {
      errors.name = "Name must contain at least 2 characters";
    }

    if (!form.username.trim()) {
      errors.username = "Username is required";
    } else if (form.username.trim().length < 3) {
      errors.username =
        "Username must contain at least 3 characters";
    }

    if (!form.email.trim()) {
      errors.email = "Email is required";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        form.email.trim()
      )
    ) {
      errors.email = "Enter a valid email address";
    }

    setFieldErrors(errors);

    return Object.keys(errors).length === 0;
  };

  /* =======================================================
     PASSWORD VALIDATION
  ======================================================= */

  const validatePassword = () => {
    const errors = {};

    if (!passwordForm.current_password) {
      errors.current_password =
        "Current password is required";
    }

    if (!passwordForm.new_password) {
      errors.new_password =
        "New password is required";
    } else if (passwordForm.new_password.length < 6) {
      errors.new_password =
        "Password must contain at least 6 characters";
    }

    if (!passwordForm.confirm_password) {
      errors.confirm_password =
        "Confirm your new password";
    } else if (
      passwordForm.new_password !==
      passwordForm.confirm_password
    ) {
      errors.confirm_password =
        "Passwords do not match";
    }

    setFieldErrors(errors);

    return Object.keys(errors).length === 0;
  };

  /* =======================================================
     SAVE PROFILE
  ======================================================= */

  const handleSaveProfile = async () => {
    if (!validateProfile()) {
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
      };

      const response = await API.put(
        "/profile",
        payload,
        authConfig
      );

      const updatedUser = response?.data?.user;

      const updatedProfile = {
        ...profile,
        ...payload,
        ...(updatedUser || {}),
      };

      setProfile(updatedProfile);
      setForm(payload);
      setOriginalForm(payload);
      setEditing(false);

      showNotification(
        response?.data?.message ||
          "Profile updated successfully",
        "success"
      );
    } catch (error) {
      console.error("Profile update error:", error);

      showNotification(
        getErrorMessage(
          error,
          "Unable to update profile"
        ),
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     CANCEL PROFILE EDIT
  ======================================================= */

  const handleCancelEdit = () => {
    setForm(originalForm);
    setFieldErrors({});
    setEditing(false);
  };

  /* =======================================================
     CHANGE PASSWORD
  ======================================================= */

  const handleChangePassword = async () => {
    if (!validatePassword()) {
      return;
    }

    setChangingPassword(true);

    try {
      const response = await API.put(
        "/profile/password",
        {
          current_password:
            passwordForm.current_password,
          new_password:
            passwordForm.new_password,
        },
        authConfig
      );

      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });

      setFieldErrors({});

      showNotification(
        response?.data?.message ||
          "Password changed successfully",
        "success"
      );
    } catch (error) {
      console.error(
        "Password change error:",
        error
      );

      showNotification(
        getErrorMessage(
          error,
          "Unable to change password"
        ),
        "error"
      );
    } finally {
      setChangingPassword(false);
    }
  };

  /* =======================================================
     SELECT IMAGE
  ======================================================= */

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      showNotification(
        "Only JPG, JPEG, PNG and WEBP images are allowed.",
        "error"
      );

      event.target.value = "";
      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      showNotification(
        "Profile picture must be less than 5 MB.",
        "error"
      );

      event.target.value = "";
      return;
    }

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    const previewURL = URL.createObjectURL(file);

    setSelectedImage(file);
    setImagePreview(previewURL);
  };

  /* =======================================================
     OPEN FILE SELECTOR
  ======================================================= */

  const handleChooseImage = () => {
    if (uploadingImage || removingImage) {
      return;
    }

    fileInputRef.current?.click();
  };

  /* =======================================================
     CANCEL SELECTED IMAGE
  ======================================================= */

  const handleCancelSelectedImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setSelectedImage(null);
    setImagePreview("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /* =======================================================
     UPLOAD PROFILE IMAGE
  ======================================================= */

  const handleUploadImage = async () => {
    if (!selectedImage) {
      showNotification(
        "Please select an image first.",
        "warning"
      );

      return;
    }

    setUploadingImage(true);

    try {
      /*
       * Use fetch only for this multipart request.
       * Do NOT manually set Content-Type.
       * The browser adds the multipart boundary automatically.
       */
      const formData = new FormData();

      formData.append(
        "profile_picture",
        selectedImage,
        selectedImage.name
      );

      const token = getToken();

      if (!token) {
        throw new Error(
          "Authentication token not found. Please login again."
        );
      }

      const baseURL = String(
        API?.defaults?.baseURL || ""
      ).replace(/\/$/, "");

      if (!baseURL) {
        throw new Error(
          "API base URL is not configured."
        );
      }

      const uploadUrl =
        `${baseURL}/profile/picture`;

      const uploadResponse = await fetch(
        uploadUrl,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          body: formData,
        }
      );

      let responseData = {};

      try {
        responseData =
          await uploadResponse.json();
      } catch {
        responseData = {};
      }

      if (!uploadResponse.ok) {
        const uploadError = new Error(
          responseData?.message ||
            responseData?.error ||
            `Profile picture upload failed (${uploadResponse.status})`
        );

        uploadError.response = {
          status: uploadResponse.status,
          data: responseData,
        };

        throw uploadError;
      }

      const updatedPicture =
        responseData?.profile_picture ||
        responseData?.profilePicture ||
        responseData?.user?.profile_picture ||
        responseData?.user?.profilePicture ||
        "";

      /*
       * Update the Profile page immediately.
       * If backend returns only message/status,
       * loadProfile() below gets the saved value from MongoDB.
       */
      if (updatedPicture) {
        setProfile((previous) => ({
          ...previous,
          profile_picture: updatedPicture,
        }));

        syncProfileImageToStorage(
          updatedPicture
        );
      }

      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }

      setSelectedImage(null);
      setImagePreview("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      showNotification(
        responseData?.message ||
          "Profile picture updated successfully.",
        "success"
      );

      /*
       * Reload profile so both Profile page and Navbar
       * use the final value stored by the backend.
       */
      await loadProfile();

      /*
       * Add a small cache-busting value for Navbar/profile
       * image rendering after a replacement upload.
       */
      window.dispatchEvent(
        new CustomEvent("profile-picture-updated", {
          detail: {
            profile_picture:
              updatedPicture || "",
          },
        })
      );
    } catch (error) {
      console.error(
        "Profile picture upload error:",
        error
      );

      console.error(
        "Profile picture upload response:",
        error?.response?.data
      );

      showNotification(
        getErrorMessage(
          error,
          "Unable to upload profile picture"
        ),
        "error"
      );
    } finally {
      setUploadingImage(false);
    }
  };

  /* =======================================================
     REMOVE PROFILE IMAGE
  ======================================================= */

  const handleRemoveImage = async () => {
    if (removingImage) {
      return;
    }

    if (
      selectedImage &&
      !profile?.profile_picture
    ) {
      handleCancelSelectedImage();
      return;
    }

    setRemovingImage(true);

    try {
      const response = await API.delete(
        "/profile/picture",
        authConfig
      );

      setProfile((previous) => ({
        ...previous,
        profile_picture: "",
        profilePicture: "",
      }));

      // Remove Navbar/Layout image also.
      syncProfileImageToStorage("");

      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }

      setSelectedImage(null);
      setImagePreview("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      showNotification(
        response?.data?.message ||
          "Profile picture removed successfully.",
        "success"
      );

      await loadProfile();
    } catch (error) {
      console.error(
        "Profile picture remove error:",
        error
      );

      console.error(
        "Remove response:",
        error?.response?.data
      );

      showNotification(
        getErrorMessage(
          error,
          "Unable to remove profile picture"
        ),
        "error"
      );
    } finally {
      setRemovingImage(false);
    }
  };

  /* =======================================================
     CURRENT IMAGE
  ======================================================= */

  const currentImage =
    imagePreview ||
    getProfileImageUrl(
      profile?.profile_picture
    );

  /* =======================================================
     INITIALS
  ======================================================= */

  const initials = getInitials(
    profile?.name,
    profile?.username
  );

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <Layout>
        <Box
          sx={{
            minHeight: "calc(100vh - 80px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Stack
            spacing={2}
            alignItems="center"
          >
            <CircularProgress size={38} />

            <Typography
              variant="body2"
              sx={{
                color: COLORS.secondaryText,
              }}
            >
              Loading profile...
            </Typography>
          </Stack>
        </Box>
      </Layout>
    );
  }

  /* =======================================================
     PROFILE ERROR
  ======================================================= */

  if (!profile) {
    return (
      <Layout>
        <Box
          sx={{
            p: {
              xs: 2,
              md: 4,
            },
          }}
        >
          <Alert severity="error">
            Unable to load profile information.
          </Alert>
        </Box>
      </Layout>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <Layout>
      <Box
        sx={{
          width: "100%",
          maxWidth: 1400,
          mx: "auto",
          p: {
            xs: 2,
            sm: 3,
            md: 4,
          },
        }}
      >
        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <Box sx={{ mb: 3 }}>
          <Typography
            variant="h4"
            fontWeight={800}
            sx={{
              letterSpacing: "-0.5px",
              color: COLORS.primaryText,
            }}
          >
            Profile
          </Typography>

          <Typography
            variant="body1"
            sx={{
              mt: 0.5,
              color: COLORS.secondaryText,
            }}
          >
            Manage your account information and
            security settings.
          </Typography>
        </Box>

        <Grid
          container
          spacing={3}
        >
          {/* =================================================
              PROFILE SUMMARY
          ================================================= */}

          <Grid
            item
            xs={12}
            md={4}
          >
            <Card
              elevation={0}
              sx={{
                height: "100%",
                borderRadius: 3,
                border: "1px solid",
                borderColor: COLORS.border,
                background:
                  "linear-gradient(145deg, rgba(25,118,210,0.10), rgba(255,255,255,0.02))",
              }}
            >
              <CardContent
                sx={{
                  p: {
                    xs: 3,
                    md: 4,
                  },
                }}
              >
                <Stack
                  alignItems="center"
                  spacing={2}
                >
                  {/* =================================================
                      PROFILE AVATAR
                  ================================================= */}

                  <Box
                    sx={{
                      position: "relative",
                    }}
                  >
                    <Avatar
                      key={
                        currentImage ||
                        "no-profile-image"
                      }
                      src={
                        currentImage ||
                        undefined
                      }
                      alt={
                        profile.name ||
                        profile.username ||
                        "User"
                      }
                      sx={{
                        width: 120,
                        height: 120,
                        fontSize: 36,
                        fontWeight: 800,
                        border: "4px solid",
                        borderColor:
                          "primary.main",
                        boxShadow:
                          "0 8px 30px rgba(25,118,210,0.25)",
                        bgcolor:
                          "primary.main",
                        color: "#FFFFFF",
                      }}
                    >
                      {!currentImage &&
                        initials}
                    </Avatar>

                    {/* CAMERA */}

                    <Tooltip title="Choose profile picture">
                      <IconButton
                        onClick={
                          handleChooseImage
                        }
                        disabled={
                          uploadingImage ||
                          removingImage
                        }
                        sx={{
                          position: "absolute",
                          right: -4,
                          bottom: -4,
                          width: 40,
                          height: 40,
                          bgcolor:
                            "primary.main",
                          color: "#FFFFFF",
                          border: "3px solid",
                          borderColor:
                            "background.paper",

                          "&:hover": {
                            bgcolor:
                              "primary.dark",
                          },

                          "& .MuiSvgIcon-root": {
                            color: "#FFFFFF",
                          },
                        }}
                      >
                        <PhotoCameraOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  {/* =================================================
                      FILE INPUT
                  ================================================= */}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    hidden
                    onChange={
                      handleImageSelect
                    }
                  />

                  {/* =================================================
                      IMAGE BUTTONS
                  ================================================= */}

                  <Stack
                    direction={{
                      xs: "column",
                      sm: "row",
                    }}
                    spacing={1}
                    width="100%"
                    justifyContent="center"
                  >
                    {/* CHOOSE */}

                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={
                        <UploadOutlinedIcon />
                      }
                      onClick={
                        handleChooseImage
                      }
                      disabled={
                        uploadingImage ||
                        removingImage
                      }
                      sx={{
                        borderRadius: 2,
                        fontWeight: 700,
                      }}
                    >
                      Choose Photo
                    </Button>

                    {/* UPLOAD */}

                    {selectedImage && (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={
                          handleUploadImage
                        }
                        disabled={
                          uploadingImage
                        }
                        startIcon={
                          uploadingImage ? (
                            <CircularProgress
                              size={16}
                              color="inherit"
                            />
                          ) : (
                            <SaveOutlinedIcon />
                          )
                        }
                        sx={{
                          borderRadius: 2,
                          fontWeight: 700,
                        }}
                      >
                        {uploadingImage
                          ? "Uploading..."
                          : "Upload"}
                      </Button>
                    )}

                    {/* CANCEL SELECTION */}

                    {selectedImage && (
                      <Button
                        variant="text"
                        color="inherit"
                        size="small"
                        startIcon={
                          <CancelOutlinedIcon />
                        }
                        onClick={
                          handleCancelSelectedImage
                        }
                        disabled={
                          uploadingImage
                        }
                        sx={{
                          borderRadius: 2,
                          fontWeight: 700,
                          color:
                            COLORS.secondaryText,

                          "& .MuiSvgIcon-root": {
                            color:
                              COLORS.secondaryText,
                          },

                          "&:hover": {
                            color:
                              COLORS.primaryText,
                          },
                        }}
                      >
                        Cancel
                      </Button>
                    )}

                    {/* REMOVE */}

                    {profile.profile_picture &&
                      !selectedImage && (
                        <Button
                          variant="text"
                          color="error"
                          size="small"
                          startIcon={
                            removingImage ? (
                              <CircularProgress
                                size={16}
                                color="inherit"
                              />
                            ) : (
                              <DeleteOutlineOutlinedIcon />
                            )
                          }
                          onClick={
                            handleRemoveImage
                          }
                          disabled={
                            removingImage ||
                            uploadingImage
                          }
                          sx={{
                            borderRadius: 2,
                            fontWeight: 700,
                          }}
                        >
                          {removingImage
                            ? "Removing..."
                            : "Remove"}
                        </Button>
                      )}
                  </Stack>

                  {/* SELECTED FILE */}

                  {selectedImage && (
                    <Typography
                      variant="caption"
                      textAlign="center"
                      sx={{
                        wordBreak:
                          "break-word",
                        color:
                          COLORS.secondaryText,
                      }}
                    >
                      Selected:{" "}
                      {selectedImage.name}
                    </Typography>
                  )}

                  {/* NAME */}

                  <Box textAlign="center">
                    <Typography
                      variant="h5"
                      fontWeight={800}
                      sx={{
                        color:
                          COLORS.primaryText,
                      }}
                    >
                      {profile.name ||
                        profile.username}
                    </Typography>

                    <Typography
                      variant="body2"
                      sx={{
                        mt: 0.5,
                        color:
                          COLORS.secondaryText,
                      }}
                    >
                      @{profile.username}
                    </Typography>
                  </Box>

                  {/* ROLE */}

                  <Chip
                    icon={
                      <SecurityOutlinedIcon />
                    }
                    label={String(
                      profile.role
                    ).toUpperCase()}
                    color={
                      profile.role === "admin"
                        ? "error"
                        : "primary"
                    }
                    variant="outlined"
                    sx={{
                      fontWeight: 700,

                      "& .MuiChip-label": {
                        color:
                          COLORS.primaryText,
                      },

                      "& .MuiChip-icon": {
                        color:
                          COLORS.primaryText,
                      },
                    }}
                  />
                </Stack>

                <Divider
                  sx={{
                    my: 3,
                    borderColor:
                      COLORS.border,
                  }}
                />

                {/* =================================================
                    PROFILE INFORMATION
                ================================================= */}

                <Stack spacing={2.2}>
                  {/* EMAIL */}

                  <Stack
                    direction="row"
                    spacing={1.5}
                    alignItems="flex-start"
                  >
                    <EmailOutlinedIcon
                      fontSize="small"
                      sx={{
                        color: COLORS.icon,
                        mt: 0.2,
                      }}
                    />

                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color:
                            COLORS.mutedText,
                        }}
                      >
                        Email
                      </Typography>

                      <Typography
                        variant="body2"
                        sx={{
                          color:
                            COLORS.primaryText,
                          wordBreak:
                            "break-word",
                        }}
                      >
                        {profile.email ||
                          "Not available"}
                      </Typography>
                    </Box>
                  </Stack>

                  {/* USERNAME */}

                  <Stack
                    direction="row"
                    spacing={1.5}
                    alignItems="flex-start"
                  >
                    <BadgeOutlinedIcon
                      fontSize="small"
                      sx={{
                        color: COLORS.icon,
                        mt: 0.2,
                      }}
                    />

                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color:
                            COLORS.mutedText,
                        }}
                      >
                        Username
                      </Typography>

                      <Typography
                        variant="body2"
                        sx={{
                          color:
                            COLORS.primaryText,
                        }}
                      >
                        {profile.username ||
                          "Not available"}
                      </Typography>
                    </Box>
                  </Stack>

                  {/* MEMBER SINCE */}

                  <Stack
                    direction="row"
                    spacing={1.5}
                    alignItems="flex-start"
                  >
                    <CalendarMonthOutlinedIcon
                      fontSize="small"
                      sx={{
                        color: COLORS.icon,
                        mt: 0.2,
                      }}
                    />

                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color:
                            COLORS.mutedText,
                        }}
                      >
                        Member since
                      </Typography>

                      <Typography
                        variant="body2"
                        sx={{
                          color:
                            COLORS.primaryText,
                        }}
                      >
                        {formatDate(
                          profile.created_at
                        )}
                      </Typography>
                    </Box>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* =================================================
              PERSONAL INFORMATION
          ================================================= */}

          <Grid
            item
            xs={12}
            md={8}
          >
            <Card
              elevation={0}
              sx={{
                borderRadius: 3,
                border: "1px solid",
                borderColor: COLORS.border,
                backgroundColor:
                  COLORS.cardBackground,
              }}
            >
              <CardContent
                sx={{
                  p: {
                    xs: 2.5,
                    sm: 3,
                    md: 4,
                  },
                }}
              >
                <Stack
                  direction={{
                    xs: "column",
                    sm: "row",
                  }}
                  justifyContent="space-between"
                  alignItems={{
                    xs: "flex-start",
                    sm: "center",
                  }}
                  spacing={2}
                  sx={{ mb: 3 }}
                >
                  <Box>
                    <Typography
                      variant="h6"
                      fontWeight={800}
                      sx={{
                        color:
                          COLORS.primaryText,
                      }}
                    >
                      Personal Information
                    </Typography>

                    <Typography
                      variant="body2"
                      sx={{
                        mt: 0.5,
                        color:
                          COLORS.secondaryText,
                      }}
                    >
                      Update your account
                      details.
                    </Typography>
                  </Box>

                  {!editing ? (
                    <Button
                      variant="outlined"
                      startIcon={
                        <EditOutlinedIcon />
                      }
                      onClick={() =>
                        setEditing(true)
                      }
                      sx={{
                        borderRadius: 2,
                        fontWeight: 700,
                      }}
                    >
                      Edit Profile
                    </Button>
                  ) : (
                    <Stack
                      direction="row"
                      spacing={1}
                    >
                      <Button
                        variant="outlined"
                        color="inherit"
                        startIcon={
                          <CloseOutlinedIcon />
                        }
                        onClick={
                          handleCancelEdit
                        }
                        disabled={saving}
                        sx={{
                          borderRadius: 2,
                          fontWeight: 700,
                          color:
                            COLORS.secondaryText,

                          "& .MuiSvgIcon-root": {
                            color:
                              COLORS.secondaryText,
                          },
                        }}
                      >
                        Cancel
                      </Button>

                      <Button
                        variant="contained"
                        startIcon={
                          saving ? (
                            <CircularProgress
                              size={18}
                              color="inherit"
                            />
                          ) : (
                            <SaveOutlinedIcon />
                          )
                        }
                        onClick={
                          handleSaveProfile
                        }
                        disabled={saving}
                        sx={{
                          borderRadius: 2,
                          fontWeight: 700,
                        }}
                      >
                        {saving
                          ? "Saving..."
                          : "Save Changes"}
                      </Button>
                    </Stack>
                  )}
                </Stack>

                <Divider
                  sx={{
                    mb: 3,
                    borderColor:
                      COLORS.border,
                  }}
                />

                <Grid
                  container
                  spacing={2.5}
                >
                  {/* FULL NAME */}

                  <Grid
                    item
                    xs={12}
                    sm={6}
                  >
                    <TextField
                      fullWidth
                      label="Full Name"
                      name="name"
                      value={form.name}
                      onChange={
                        handleChange
                      }
                      disabled={!editing}
                      error={Boolean(
                        fieldErrors.name
                      )}
                      helperText={
                        fieldErrors.name || " "
                      }
                      sx={darkTextFieldSx}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonOutlineIcon />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  {/* USERNAME */}

                  <Grid
                    item
                    xs={12}
                    sm={6}
                  >
                    <TextField
                      fullWidth
                      label="Username"
                      name="username"
                      value={form.username}
                      onChange={
                        handleChange
                      }
                      disabled={!editing}
                      error={Boolean(
                        fieldErrors.username
                      )}
                      helperText={
                        fieldErrors.username ||
                        " "
                      }
                      sx={darkTextFieldSx}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <BadgeOutlinedIcon />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  {/* EMAIL */}

                  <Grid
                    item
                    xs={12}
                  >
                    <TextField
                      fullWidth
                      label="Email Address"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={
                        handleChange
                      }
                      disabled={!editing}
                      error={Boolean(
                        fieldErrors.email
                      )}
                      helperText={
                        fieldErrors.email || " "
                      }
                      sx={darkTextFieldSx}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <EmailOutlinedIcon />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* =================================================
              PASSWORD
          ================================================= */}

          <Grid
            item
            xs={12}
          >
            <Card
              elevation={0}
              sx={{
                borderRadius: 3,
                border: "1px solid",
                borderColor: COLORS.border,
                backgroundColor:
                  COLORS.cardBackground,
              }}
            >
              <CardContent
                sx={{
                  p: {
                    xs: 2.5,
                    sm: 3,
                    md: 4,
                  },
                }}
              >
                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  sx={{ mb: 1 }}
                >
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor:
                        "rgba(144,202,249,0.10)",
                    }}
                  >
                    <LockOutlinedIcon
                      sx={{
                        color: COLORS.primary,
                      }}
                    />
                  </Box>

                  <Box>
                    <Typography
                      variant="h6"
                      fontWeight={800}
                      sx={{
                        color:
                          COLORS.primaryText,
                      }}
                    >
                      Password & Security
                    </Typography>

                    <Typography
                      variant="body2"
                      sx={{
                        color:
                          COLORS.secondaryText,
                      }}
                    >
                      Keep your account secure
                      with a strong password.
                    </Typography>
                  </Box>
                </Stack>

                <Divider
                  sx={{
                    my: 3,
                    borderColor:
                      COLORS.border,
                  }}
                />

                <Grid
                  container
                  spacing={2.5}
                >
                  {/* CURRENT PASSWORD */}

                  <Grid
                    item
                    xs={12}
                    md={4}
                  >
                    <TextField
                      fullWidth
                      label="Current Password"
                      name="current_password"
                      type={
                        showCurrentPassword
                          ? "text"
                          : "password"
                      }
                      value={
                        passwordForm.current_password
                      }
                      onChange={
                        handlePasswordChange
                      }
                      error={Boolean(
                        fieldErrors.current_password
                      )}
                      helperText={
                        fieldErrors.current_password ||
                        " "
                      }
                      sx={darkTextFieldSx}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockOutlinedIcon />
                          </InputAdornment>
                        ),

                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() =>
                                setShowCurrentPassword(
                                  (previous) =>
                                    !previous
                                )
                              }
                              edge="end"
                              sx={{
                                color:
                                  COLORS.icon,

                                "& .MuiSvgIcon-root": {
                                  color:
                                    COLORS.icon,
                                },
                              }}
                            >
                              {showCurrentPassword ? (
                                <VisibilityOffOutlinedIcon />
                              ) : (
                                <VisibilityOutlinedIcon />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  {/* NEW PASSWORD */}

                  <Grid
                    item
                    xs={12}
                    md={4}
                  >
                    <TextField
                      fullWidth
                      label="New Password"
                      name="new_password"
                      type={
                        showNewPassword
                          ? "text"
                          : "password"
                      }
                      value={
                        passwordForm.new_password
                      }
                      onChange={
                        handlePasswordChange
                      }
                      error={Boolean(
                        fieldErrors.new_password
                      )}
                      helperText={
                        fieldErrors.new_password ||
                        "Minimum 6 characters"
                      }
                      sx={darkTextFieldSx}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockOutlinedIcon />
                          </InputAdornment>
                        ),

                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() =>
                                setShowNewPassword(
                                  (previous) =>
                                    !previous
                                )
                              }
                              edge="end"
                              sx={{
                                color:
                                  COLORS.icon,

                                "& .MuiSvgIcon-root": {
                                  color:
                                    COLORS.icon,
                                },
                              }}
                            >
                              {showNewPassword ? (
                                <VisibilityOffOutlinedIcon />
                              ) : (
                                <VisibilityOutlinedIcon />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  {/* CONFIRM PASSWORD */}

                  <Grid
                    item
                    xs={12}
                    md={4}
                  >
                    <TextField
                      fullWidth
                      label="Confirm New Password"
                      name="confirm_password"
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      value={
                        passwordForm.confirm_password
                      }
                      onChange={
                        handlePasswordChange
                      }
                      error={Boolean(
                        fieldErrors.confirm_password
                      )}
                      helperText={
                        fieldErrors.confirm_password ||
                        "Re-enter your new password"
                      }
                      sx={darkTextFieldSx}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockOutlinedIcon />
                          </InputAdornment>
                        ),

                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() =>
                                setShowConfirmPassword(
                                  (previous) =>
                                    !previous
                                )
                              }
                              edge="end"
                              sx={{
                                color:
                                  COLORS.icon,

                                "& .MuiSvgIcon-root": {
                                  color:
                                    COLORS.icon,
                                },
                              }}
                            >
                              {showConfirmPassword ? (
                                <VisibilityOffOutlinedIcon />
                              ) : (
                                <VisibilityOutlinedIcon />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  {/* PASSWORD BUTTON */}

                  <Grid
                    item
                    xs={12}
                  >
                    <Stack
                      direction={{
                        xs: "column",
                        sm: "row",
                      }}
                      justifyContent="space-between"
                      alignItems={{
                        xs: "stretch",
                        sm: "center",
                      }}
                      spacing={2}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color:
                            COLORS.secondaryText,
                        }}
                      >
                        Use a strong password
                        that you do not use
                        elsewhere.
                      </Typography>

                      <Button
                        variant="contained"
                        startIcon={
                          changingPassword ? (
                            <CircularProgress
                              size={18}
                              color="inherit"
                            />
                          ) : (
                            <LockOutlinedIcon />
                          )
                        }
                        onClick={
                          handleChangePassword
                        }
                        disabled={
                          changingPassword
                        }
                        sx={{
                          minWidth: {
                            xs: "100%",
                            sm: 190,
                          },
                          borderRadius: 2,
                          fontWeight: 700,
                        }}
                      >
                        {changingPassword
                          ? "Updating..."
                          : "Change Password"}
                      </Button>
                    </Stack>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* =================================================
            SNACKBAR
        ================================================= */}

        <Snackbar
          open={notification.open}
          autoHideDuration={4000}
          onClose={closeNotification}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
        >
          <Alert
            onClose={closeNotification}
            severity={notification.severity}
            variant="filled"
            sx={{
              width: "100%",
              borderRadius: 2,
            }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      </Box>
    </Layout>
  );
}