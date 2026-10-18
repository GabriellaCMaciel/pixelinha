"""Create the Hugging Face Space if needed, set its variables and upload backend/.

Reads from the environment:
  HF_TOKEN                a token with write permission (required)
  HF_SPACE                "user/name" of the Space (default: <token owner>/pixelinha-api)
  ALLOWED_ORIGINS         sites allowed to call the API, comma separated (optional)
  ALLOWED_ORIGIN_REGEX    pattern of allowed sites (default: Vercel addresses of this project)
  GITHUB_SHA              used in the commit message
"""

import os
import sys
from pathlib import Path

from huggingface_hub import HfApi

DEFAULT_SPACE_NAME = "pixelinha-api"
DEFAULT_ORIGIN_REGEX = r"https://pixelinha[a-z0-9-]*\.vercel\.app"
IGNORE = [
    ".venv/*",
    ".pytest_cache/*",
    "**/__pycache__/*",
    "tests/*",
    "pytest.ini",
    "requirements-dev.txt",
    ".env",
    ".env.*",
]


def space_url(repo_id: str) -> str:
    """Address of a running Docker Space: user-name.hf.space, in lowercase."""
    owner, name = repo_id.split("/", 1)
    return f"https://{owner}-{name}.hf.space".lower().replace("_", "-")


def main() -> int:
    token = os.environ["HF_TOKEN"]
    api = HfApi(token=token)

    repo_id = os.environ.get("HF_SPACE", "").strip()
    if not repo_id:
        repo_id = f"{api.whoami()['name']}/{DEFAULT_SPACE_NAME}"

    api.create_repo(repo_id, repo_type="space", space_sdk="docker", exist_ok=True)

    origins = os.environ.get("ALLOWED_ORIGINS", "").strip()
    if origins:
        api.add_space_variable(repo_id, "PIXELINHA_ALLOWED_ORIGINS", origins)
    regex = os.environ.get("ALLOWED_ORIGIN_REGEX", "").strip() or DEFAULT_ORIGIN_REGEX
    api.add_space_variable(repo_id, "PIXELINHA_ALLOWED_ORIGIN_REGEX", regex)

    api.upload_folder(
        folder_path="backend",
        repo_id=repo_id,
        repo_type="space",
        commit_message=f"Deploy from GitHub: {os.environ.get('GITHUB_SHA', 'manual')}",
        delete_patterns="*",
        ignore_patterns=IGNORE,
    )

    url = space_url(repo_id)
    print(f"Deployed to https://huggingface.co/spaces/{repo_id}")
    print(f"The API will answer at {url} once the build finishes (a few minutes).")

    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        Path(summary).write_text(
            f"### Back-end deployed\n\n"
            f"- Space: https://huggingface.co/spaces/{repo_id}\n"
            f"- API address (use it as `VITE_API_URL` in Vercel): `{url}`\n",
            encoding="utf-8",
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
