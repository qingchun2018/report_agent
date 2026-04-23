import os
import logging

logger = logging.getLogger(__name__)

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB = os.getenv("MONGODB_DB", "report_agent")

client = None
_use_mock = False


async def connect_db():
    global client, _use_mock
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        real_client = AsyncIOMotorClient(MONGODB_URI, serverSelectionTimeoutMS=3000)
        await real_client.admin.command("ping")
        client = real_client
        _use_mock = False
        logger.info("Connected to MongoDB")
    except Exception:
        logger.warning("MongoDB not available, using in-memory mock database")
        from mongomock_motor import AsyncMongoMockClient
        client = AsyncMongoMockClient()
        _use_mock = True


async def close_db():
    global client
    if client and not _use_mock:
        client.close()


def get_db():
    return client[MONGODB_DB]
