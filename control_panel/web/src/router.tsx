import LoginPage from "./pages/login/LoginPage";
import AppspendPage from "./pages/AppspendPage";
import SignupPage from "./pages/signup/SignupPage";
import { createBrowserRouter, RouteObject } from "react-router-dom";
import ProfilePage from "./pages/settings/ProfilePage";
import PasswordPage from "./pages/settings/SecurityPage";
import AccountManagementPage from "./pages/settings/AccountManagementPage";
import ApiKeyGenPage from "./pages/settings/ApiKeyGenPage";
import LLMConfigurationPage from "./pages/settings/LLMConfigurationPage";
import AuthRoute from "./components/account_layout/AuthRoute";
import DefaultPage from "./pages/DefaultPage";
import {
  LLMCreateConfigurationManagerPage,
  LlmUpdateConfigurationManagerPage,
} from "./pages/settings/LLMConfigurationManagerPage";
import BudgetPage from "./pages/BudgetPage";
import UtilizationPage from "./pages/UtilizationPage";
import ModelPoolPage from "./pages/settings/ModelPoolPage";
import PolicyPage from "./pages/settings/PolicyPage";
import {
  PolicyUpdateConfigurationPage,
  PolicyConfigurationPage,
} from "./pages/settings/PolicyConfigurationPage";
import ConfigurationPage from "./pages/settings/ConfigurationPage";
import OverviewPage from "./pages/OverviewPage";
import RolesPage from "./pages/settings/RolesPage";

const getAuthRoutes = (): RouteObject[] =>
  [
    {
      path: "/overview",
      element: <OverviewPage />,
    },
    {
      path: "/appspend",
      element: <AppspendPage />,
    },
    {
      path: "/usage",
      element: <UtilizationPage />,
    },
    {
      path: "/budget",
      element: <BudgetPage />,
    },
    {
      path: "/apikey",
      element: <ApiKeyGenPage />,
    },
    {
      path: "/llmconfig",
      element: <LLMConfigurationPage />,
    },
    {
      path: "/llmconfig/manage/",
      element: <LLMCreateConfigurationManagerPage />,
    },
    {
      path: "/llmconfig/manage/:id",
      element: <LlmUpdateConfigurationManagerPage />,
    },
    {
      path: "/modelpool",
      element: <ModelPoolPage />,
    },
    {
      path: "/policies",
      element: <PolicyPage />,
    },
    {
      path: "/policies/manage",
      element: <PolicyConfigurationPage />,
    },
    {
      path: "/policies/manage/:id",
      element: <PolicyUpdateConfigurationPage />,
    },
    {
      path: "/settings",
      element: <ProfilePage />,
    },
    {
      path: "/settings/profile",
      element: <ProfilePage />,
    },
    {
      path: "/settings/security",
      element: <PasswordPage />,
    },
    {
      path: "/settings/accounts",
      element: <AccountManagementPage />,
      errorElement: <LoginPage />,
    },
    {
      path: "/settings/roles",
      element: <RolesPage />,
      errorElement: <LoginPage />,
    },
    {
      path: "/settings/policies",
      element: <PolicyPage />,
    },
    {
      path: "/settings/policies/manage",
      element: <PolicyConfigurationPage />,
    },
    {
      path: "/settings/policies/manage/:id",
      element: <PolicyUpdateConfigurationPage />,
    },
    {
      path: "/settings/configuration",
      element: <ConfigurationPage />,
    },
    {
      path: "/settings/llmconfig",
      element: <LLMConfigurationPage />,
    },
    {
      path: "/settings/llmconfig/manage",
      element: <LLMCreateConfigurationManagerPage />,
    },
    {
      path: "/settings/llmconfig/manage/:id",
      element: <LlmUpdateConfigurationManagerPage />,
    },
  ].map((route) => ({
    ...route,
    element: <AuthRoute>{route.element}</AuthRoute>,
  }));

export const router = createBrowserRouter([
  {
    path: "/",
    element: <DefaultPage />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/signup",
    element: <SignupPage />,
  },
  ...getAuthRoutes(),
]);
