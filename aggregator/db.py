import logging
import trussed.init

from typing import *

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import *

from trussed.env import env


log = logger = logging.getLogger(__name__)


try:
    # Initialize MongoDB client
    log.debug('Attempting to connect to MongoDB')
    client = AsyncIOMotorClient(env.str('MONGODB_URL', 'mongodb://localhost:27017'))
    db = client.get_database(env.str('MONGODB_NAME', 'guardian'))
    log.info('Successfully connected to MongoDB database: %s', db.name)
except ConnectionError as e:
    log.error('Failed to connect to MongoDB: %s', e)
    raise


async def init():
    """
    Initializes the trussed application with the database and app configuration.
    """
    log.debug("Starting initialization of trussed with database: %s", db.name)
    try:
        version = open('VERSION').read().strip()
        log.debug("Read application version: %s", version)
        
        await trussed.init.init(
            db=db,
            appname='aggregator',
            version=version,
        )
        log.info("Trussed initialized successfully with appname='aggregator' and version='%s'", version)
    except Exception as e:
        log.exception("An error occurred during trussed initialization: %s", e)
        raise