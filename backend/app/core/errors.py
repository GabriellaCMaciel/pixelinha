from fastapi import HTTPException


def api_error(status_code: int, code: str, message: str, **details) -> HTTPException:
    """Build an error whose body is {"detail": {"code", "message", ...}}.

    The stable `code` lets the front-end show a translated message, while
    `message` stays readable for anyone calling the API directly.
    """
    return HTTPException(
        status_code=status_code,
        detail={"code": code, "message": message, **details},
    )
