const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");
const { jwtSecret } = require("../config/env");
const AppError = require("./AppError");
const authModel = require("../models/authModel");

const SESSION_SECONDS = 60 * 60;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[0-9]{8,15}$/;

function requiredText(value, field, maxLength) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.trim().length > maxLength
  ) {
    throw new AppError(
      `${field} is required and must be at most ${maxLength} characters`,
      400,
      "VALIDATION_ERROR",
    );
  }
  return value.trim();
}

function validatePassword(value) {
  if (
    typeof value !== "string" ||
    value.length < 8 ||
    Buffer.byteLength(value, "utf8") > 72
  ) {
    throw new AppError(
      "Password must be between 8 and 72 bytes",
      400,
      "VALIDATION_ERROR",
    );
  }
  return value;
}

function validateEmail(value) {
  const email = requiredText(value, "Email", 150).toLowerCase();
  if (!emailPattern.test(email)) {
    throw new AppError("Email is invalid", 400, "VALIDATION_ERROR");
  }
  return email;
}

function validatePhone(value) {
  const phone = requiredText(value, "Phone", 20);
  if (!phonePattern.test(phone)) {
    throw new AppError("Phone is invalid", 400, "VALIDATION_ERROR");
  }
  return phone;
}

function safeUser(identity) {
  const user = {
    userId: identity.user_id,
    email: identity.email,
    role: identity.role,
  };

  if (identity.customer_id) {
    user.customer = {
      customerId: identity.customer_id,
      fullName: identity.customer_name,
      phone: identity.customer_phone,
      dateOfBirth: identity.customer_date_of_birth,
    };
  } else if (identity.restaurant_id) {
    user.restaurant = {
      restaurantId: identity.restaurant_id,
      name: identity.restaurant_name,
    };
  } else if (identity.shipper_id) {
    user.shipper = {
      shipperId: identity.shipper_id,
      fullName: identity.shipper_name,
      phone: identity.shipper_phone,
    };
  } else if (identity.admin_id) {
    user.admin = {
      adminId: identity.admin_id,
      fullName: identity.admin_name,
    };
  }

  return user;
}

function handleDuplicate(error) {
  if (error.code === "ER_DUP_ENTRY") {
    throw new AppError(
      "Email or phone is already registered",
      409,
      "ACCOUNT_EXISTS",
    );
  }
  throw error;
}

async function issueToken(connection, userId, role) {
  const sessionId = randomUUID();
  await connection.execute(
    `INSERT INTO user_sessions (session_id, user_id, expires_at)
     VALUES (?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ${SESSION_SECONDS} SECOND))`,
    [sessionId, userId],
  );

  const token = jwt.sign({ role }, jwtSecret, {
    subject: String(userId),
    jwtid: sessionId,
    expiresIn: SESSION_SECONDS,
    issuer: "food-delivery-backend",
    audience: "food-delivery-api",
  });

  return { token, expiresIn: SESSION_SECONDS };
}

async function registerCustomer(input) {
  const allowedFields = new Set([
    "email",
    "password",
    "fullName",
    "phone",
    "dateOfBirth",
  ]);
  if (Object.keys(input).some((key) => !allowedFields.has(key))) {
    throw new AppError(
      "Registration contains unsupported fields",
      400,
      "VALIDATION_ERROR",
    );
  }

  const email = validateEmail(input.email);
  const password = validatePassword(input.password);
  const fullName = requiredText(input.fullName, "Full name", 100);
  const phone = validatePhone(input.phone);
  let dateOfBirth = null;
  if (
    input.dateOfBirth !== undefined &&
    input.dateOfBirth !== null &&
    input.dateOfBirth !== ""
  ) {
    if (
      typeof input.dateOfBirth !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(input.dateOfBirth)
    ) {
      throw new AppError(
        "Date of birth must use YYYY-MM-DD",
        400,
        "VALIDATION_ERROR",
      );
    }
    const date = new Date(`${input.dateOfBirth}T00:00:00Z`);
    if (
      Number.isNaN(date.valueOf()) ||
      date.toISOString().slice(0, 10) !== input.dateOfBirth
    ) {
      throw new AppError("Date of birth is invalid", 400, "VALIDATION_ERROR");
    }
    dateOfBirth = input.dateOfBirth;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const connection = await authModel.pool.getConnection();
  try {
    await connection.beginTransaction();
    const [roles] = await connection.execute(
      "SELECT role_id FROM user_roles WHERE role_name = ? LIMIT 1",
      ["CUSTOMER"],
    );
    const [statuses] = await connection.execute(
      "SELECT status_id FROM user_statuses WHERE status_name = ? LIMIT 1",
      ["ACTIVE"],
    );
    if (!roles.length || !statuses.length) {
      throw new Error("Required CUSTOMER role or ACTIVE status is missing");
    }

    const [userResult] = await connection.execute(
      "INSERT INTO users (role_id, email, password_hash, status_id) VALUES (?, ?, ?, ?)",
      [roles[0].role_id, email, passwordHash, statuses[0].status_id],
    );
    const [customerResult] = await connection.execute(
      "INSERT INTO customers (user_id) VALUES (?)",
      [userResult.insertId],
    );
    await connection.execute(
      `INSERT INTO customer_profiles (customer_id, full_name, phone, date_of_birth)
       VALUES (?, ?, ?, ?)`,
      [customerResult.insertId, fullName, phone, dateOfBirth],
    );
    await connection.commit();

    return {
      user: {
        userId: userResult.insertId,
        customerId: customerResult.insertId,
        email,
        role: "CUSTOMER",
        fullName,
        phone,
        dateOfBirth,
      },
    };
  } catch (error) {
    await connection.rollback();
    handleDuplicate(error);
  } finally {
    connection.release();
  }
}

async function login(emailInput, passwordInput) {
  const email = validateEmail(emailInput);
  const password = validatePassword(passwordInput);
  const identity = await authModel.getIdentityByEmail(email);
  if (!identity || !(await bcrypt.compare(password, identity.password_hash))) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }
  if (identity.user_status !== "ACTIVE") {
    throw new AppError("Account is locked or inactive", 403, "ACCOUNT_LOCKED");
  }

  const connection = await authModel.pool.getConnection();
  try {
    await connection.beginTransaction();
    const [activeUsers] = await connection.execute(
      `SELECT u.user_id
       FROM users u
       JOIN user_statuses status ON status.status_id = u.status_id
       WHERE u.user_id = ? AND status.status_name = 'ACTIVE'
       FOR UPDATE`,
      [identity.user_id],
    );
    if (!activeUsers.length) {
      throw new AppError(
        "Account is locked or inactive",
        403,
        "ACCOUNT_LOCKED",
      );
    }
    const session = await issueToken(
      connection,
      identity.user_id,
      identity.role,
    );
    await connection.commit();
    return { ...session, user: safeUser(identity) };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function logout(user) {
  await authModel.revokeSession(user.sessionId, user.userId);
}

async function getProfile(userId) {
  const identity = await authModel.getIdentityById(userId);
  if (!identity || identity.user_status !== "ACTIVE") {
    throw new AppError("Account is unavailable", 403, "ACCOUNT_LOCKED");
  }
  return safeUser(identity);
}

async function updateProfile(user, input) {
  const allowedFields = new Set(["email", "fullName", "phone", "dateOfBirth"]);
  if (
    !Object.keys(input).length ||
    Object.keys(input).some((key) => !allowedFields.has(key))
  ) {
    throw new AppError(
      "Profile contains unsupported or empty fields",
      400,
      "VALIDATION_ERROR",
    );
  }

  const connection = await authModel.pool.getConnection();
  try {
    await connection.beginTransaction();
    if (input.email !== undefined) {
      await connection.execute("UPDATE users SET email = ? WHERE user_id = ?", [
        validateEmail(input.email),
        user.userId,
      ]);
    }

    if (
      user.role === "CUSTOMER" ||
      user.role === "SHIPPER" ||
      user.role === "ADMIN"
    ) {
      const values = [];
      const updates = [];
      const profileTable =
        user.role === "CUSTOMER"
          ? "customer_profiles"
          : user.role === "SHIPPER"
            ? "shippers"
            : "admins";
      const ownerColumn =
        user.role === "CUSTOMER"
          ? "customer_id"
          : `${user.role.toLowerCase()}_id`;
      const ownerId =
        user.role === "CUSTOMER"
          ? user.customerId
          : user.role === "SHIPPER"
            ? user.shipperId
            : user.adminId;

      if (input.fullName !== undefined) {
        if (
          profileTable === "shippers" ||
          profileTable === "admins" ||
          profileTable === "customer_profiles"
        ) {
          updates.push("full_name = ?");
          values.push(requiredText(input.fullName, "Full name", 100));
        }
      }
      if (input.phone !== undefined) {
        if (
          profileTable === "shippers" ||
          profileTable === "customer_profiles"
        ) {
          updates.push("phone = ?");
          values.push(validatePhone(input.phone));
        } else {
          throw new AppError(
            "Phone cannot be updated for this account type",
            400,
            "VALIDATION_ERROR",
          );
        }
      }
      if (input.dateOfBirth !== undefined) {
        if (user.role !== "CUSTOMER") {
          throw new AppError(
            "Date of birth cannot be updated for this account type",
            400,
            "VALIDATION_ERROR",
          );
        }
        const value = input.dateOfBirth;
        if (
          value !== null &&
          (typeof value !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
            Number.isNaN(new Date(`${value}T00:00:00Z`).valueOf()) ||
            new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value)
        ) {
          throw new AppError(
            "Date of birth must use YYYY-MM-DD",
            400,
            "VALIDATION_ERROR",
          );
        }
        updates.push("date_of_birth = ?");
        values.push(value || null);
      }
      if (updates.length) {
        values.push(ownerId);
        await connection.execute(
          `UPDATE ${profileTable} SET ${updates.join(", ")} WHERE ${ownerColumn} = ?`,
          values,
        );
      }
    } else if (
      input.fullName !== undefined ||
      input.phone !== undefined ||
      input.dateOfBirth !== undefined
    ) {
      throw new AppError(
        "Profile fields cannot be updated for this account type",
        400,
        "VALIDATION_ERROR",
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    handleDuplicate(error);
  } finally {
    connection.release();
  }

  return getProfile(user.userId);
}

async function changePassword(user, currentPasswordInput, newPasswordInput) {
  const currentPassword = validatePassword(currentPasswordInput);
  const newPassword = validatePassword(newPasswordInput);
  if (currentPassword === newPassword) {
    throw new AppError(
      "New password must differ from current password",
      400,
      "VALIDATION_ERROR",
    );
  }

  const connection = await authModel.pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      "SELECT password_hash FROM users WHERE user_id = ? AND status_id = (SELECT status_id FROM user_statuses WHERE status_name = ?) FOR UPDATE",
      [user.userId, "ACTIVE"],
    );
    if (
      !rows.length ||
      !(await bcrypt.compare(currentPassword, rows[0].password_hash))
    ) {
      throw new AppError(
        "Current password is incorrect",
        401,
        "INVALID_CREDENTIALS",
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await connection.execute(
      "UPDATE users SET password_hash = ? WHERE user_id = ?",
      [passwordHash, user.userId],
    );
    await connection.execute(
      "UPDATE user_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = ? AND revoked_at IS NULL",
      [user.userId],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  registerCustomer,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword,
};
