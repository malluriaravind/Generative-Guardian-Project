import * as yup from "yup";
import { Watch } from "./types/watch";

const passwordPattern = yup
  .string()
  .required("Field is required")
  .min(8, "At least 8 characters long")
  .matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})/,
    "At least one uppercase, one lowercase, one Number and one special case character",
  );

const passwordSchema = yup.object().shape({
  newPassword: passwordPattern,
  newPassword2: yup
    .string()
    .required("Field is required")
    .oneOf(
      [yup.ref("newPassword")],
      "New password and Confirm password must match",
    ),
});

export const loginSchema = yup.object().shape({
  email: yup
    .string()
    .required("Field is required")
    .email("Please enter a valid email"),
  password: yup.string().required("Field is required"),
  rememberme: yup.bool().default(false),
});

type PasswordForm = {
  oldPassword: string;
  newPassword: string;
  newPassword2: string;
};

export const changePasswordSchema = yup.object().shape({
  oldPassword: yup.string().required("Current password is required"),
  newPassword: passwordPattern,
  newPassword2: yup
    .string()
    .required("Field is required")
    .oneOf([yup.ref("newPassword")], "Passwords must match"),
}) as yup.ObjectSchema<PasswordForm>;

export const changeAccountPasswordSchema = passwordSchema;

export const updateUserSchema = yup.object().shape({
  firstName: yup.string().required().min(3),
  lastName: yup.string().required().min(3),
  email: yup.string().required().email("Please enter a valid email"),
  assignedScopes: yup.array().of(yup.string()).notRequired().default([]),
  scopes: yup.array().of(yup.string()).notRequired().default([]),
  roles: yup.array().of(yup.string()).notRequired().default([]),
  is_root: yup.boolean().default(false),
});

export const createUserSchema = yup.object().shape({
  isSsoUser: yup.boolean().default(false),
  firstName: yup.string().required(),
  lastName: yup.string().required(),
  email: yup.string().required().email("Please enter a valid email"),
  assignedScopes: yup.array().of(yup.string()).notRequired().default([]),
  scopes: yup.array().of(yup.string()).notRequired().default([]),
  roles: yup.array().of(yup.string()).notRequired().default([]),
  is_root: yup.boolean().default(false),
  password: passwordPattern,
  password2: yup
    .string()
    .required("Field is required")
    .oneOf(
      [yup.ref("password")],
      "New password and Confirm password must match",
    ),
});

export const alertSchema = yup.object().shape({
  name: yup
    .string()
    .min(3, "Name should have at least 3 characters")
    .required(),
  alert_type: yup
    .string()
    .oneOf(["spend"], "Alert type is required")
    .required("Alert type is required field"),
  budget: yup.number().nullable(), //.positive("Number should be positive"),
  budget_percentage: yup.number().nullable(),
  apps: yup
    .object<Watch>()
    .shape({
      name: yup.string().nonNullable().required("Please choose app or model"),
    })
    .required("App or model is required"),
  atmost: yup.string().required("Alert frequency is required"),
  timezone: yup.string().required("Timezone is required"),
  scopes: yup.array().of(yup.string()).notRequired().default([]),
  notify_to: yup
    .array()
    .min(1)
    .required()
    .of(
      yup
        .string()
        .email("Emails must have correct form")
        .required("Must be required"),
    ),
});

export const budgetSchema = yup.object().shape({
  name: yup
    .string()
    .min(3, "Name should have at least 3 characters")
    .required(),
  period: yup.string().required("Period is required"),
  watch: yup
    .object<Watch>()
    .shape({
      name: yup.string().nonNullable().required("Please choose app or model"),
    })
    .required("App or model is required"),
  timezone: yup.string().required("Timezone is required"),
  budget: yup.number().required("Budget value is required"),
  limited: yup.boolean(),
  starts_at: yup.date(),
  ends_at: yup.date(),
  mode: yup.string(),
  scopes: yup.array().of(yup.string()).notRequired().default([]),
});

export const modelSchema = yup.object().shape({
  name: yup
    .string()
    .min(3, "Name should have at least 3 characters")
    .required(),
  alias: yup
    .string()
    .min(3, "Alias should have at least 3 characters")
    .required(),
  price_input: yup
    .number()
    .moreThan(-1, "The number must be positive")
    .required("Input price value is required"),
  price_output: yup
    .number()
    .moreThan(-1, "The number must be positive")
    .required("Output price value is required"),
});

export const resetPasswordSchema = yup.object().shape({
  email: yup
    .string()
    .email("Invalid email format")
    .required("Email is required"),
});
