from datetime import datetime
from typing import Optional, List
from enum import Enum


class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class VulnStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    FIXED = "fixed"
    WONT_FIX = "wont_fix"


class LicenseRisk(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


VULNERABILITY_SCHEMA = {
    "cve_id": str,
    "title": str,
    "severity": Severity,
    "status": VulnStatus,
    "affected_versions": List[str],
    "description": str,
    "published_date": datetime,
    "discovered_date": datetime,
    "fixed_date": Optional[datetime],
    "cvss_score": float,
    "source": str,
}

VERSION_SCHEMA = {
    "name": str,
    "version": str,
    "release_date": datetime,
    "dependencies": List[str],
    "vuln_count": int,
    "license": str,
    "repo_url": str,
}

LICENSE_SCHEMA = {
    "name": str,
    "spdx_id": str,
    "risk_level": LicenseRisk,
    "permissions": List[str],
    "limitations": List[str],
    "conditions": List[str],
    "used_by_count": int,
}

GITHUB_TREND_SCHEMA = {
    "repo_name": str,
    "owner": str,
    "description": str,
    "language": str,
    "stars": int,
    "stars_today": int,
    "stars_week": int,
    "forks": int,
    "open_issues": int,
    "license": str,
    "topics": List[str],
    "created_at": datetime,
    "snapshot_date": datetime,
}
