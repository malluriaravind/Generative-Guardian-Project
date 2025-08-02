# fmt: off
from sys import path
from environs import Env

env = Env()
env.read_env()

path.append('../..')
path.extend(env.list('PYTHONPATH', []))

# General configuration
ENVIRONMENT = env.str("ENVIRONMENT", "production")

# JWT configurations
JWT_TTL_MINUTES: int      = env.int("JWT_TTL_MINUTES", 30)
JWT_TTL_MINUTES_LONG: int = env.int("JWT_TTL_MINUTES_LONG", 60*24*7)
JWT_MAX_PER_USER: int     = env.int("JWT_MAX_PER_USER", 10)
JWT_ALGORITHM: str        = 'HS256'
JWT_SECRET: str           = env.str("JWT_SECRET","ccab4de5140194abea0e87889aba086231580a8d5796cf62e3a5dedd1fe5d2e8")

# MongoDB configurations
DATABASE_URL  = env.str("DATABASE_URL", "mongodb://localhost:27017")
DATABASE_NAME = env.str("DATABASE_NAME", "guardian")

# Server configurations
CONTROL_PANEL_HOST = env.str("HOST", "localhost")
CONTROL_PANEL_PORT = env.int("PORT", 8007)

ROOT_USER_EMAIL    = env.str("ROOT_USER_EMAIL", "malluriaravind9@gmail.com")
ROOT_USER_PASSWORD = env.str("ROOT_USER_PASSWORD","Aravindreddy!1234")

# Single-sign-on related data
SSO_PASSWORD = env.str("SSO_PASSWORD", "ssopassword")
