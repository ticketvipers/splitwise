import os
from slowapi import Limiter
from slowapi.util import get_remote_address

# Allow disabling rate limits in test environments
_enabled = os.environ.get("RATELIMIT_ENABLED", "true").lower() != "false"

limiter = Limiter(key_func=get_remote_address, enabled=_enabled)
