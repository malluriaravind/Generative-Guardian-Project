import logging
import asyncio
import trussed.init

from motor.motor_asyncio import AsyncIOMotorClient

from control_panel import config
from trussed.models.user import User


log = logging.getLogger(__name__)
client = AsyncIOMotorClient(config.DATABASE_URL, tz_aware=True)
db = client.get_database(config.DATABASE_NAME)


async def init():
    log.debug("Starting initialization of trussed.")
    try:
        await trussed.init.init(
            db=db,
            appname='control_panel',
            version=open('../VERSION').read().strip(),
        )
        log.info("Trussed initialized successfully.")
    except Exception as e:
        log.error("Failed to initialize trussed.", exc_info=True)
        raise

    try:
        task = User.cleanup_expired_tokens_forever()
        asyncio.create_task(task, name='login-cleanup')
        log.info("Cleanup task for expired tokens started.")
    except Exception as e:
        log.error("Failed to start cleanup task for expired tokens.", exc_info=True)

    if config.ROOT_USER_EMAIL and config.ROOT_USER_PASSWORD:
        log.debug("Checking for the existence of the root user.")
        try:
            user = await User.find_one({'email': config.ROOT_USER_EMAIL})
            if user:
                log.info(f"The root user '{user.email}' already exists.")
                if not user.check_password(config.ROOT_USER_PASSWORD):
                    log.warning(f"Password mismatch for root user '{user.email}'. Updating password.")
                    await user.set_password(config.ROOT_USER_PASSWORD).save()
                    log.info("The root user's password has been updated.")
                else:
                    log.debug("Root user's password is already up-to-date.")
            else:
                log.info("Root user not found. Creating a new root user.")
                user = User(
                    first_name='Root',
                    last_name='Admin',
                    email=config.ROOT_USER_EMAIL,
                    roles=None,
                    is_root=True,
                    password_hash=User.new_password_hash(config.ROOT_USER_PASSWORD),
                )
                await user.insert()
                log.info(f"The root user '{user.email}' has been successfully created.")
        except Exception as e:
            log.error("An error occurred while handling the root user.", exc_info=True)
    else:
        log.warning("Root user email or password is not configured.")

    log.debug("Initialization process completed.")
