import time
from typing import Callable, TypeVar, Optional
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)

def invoke_with_retry(
    invoke_fn: Callable[[], T],
    max_retries: int = 3,
    backoff_seconds: float = 2.0,
    fallback: Optional[T] = None
) -> T:
    """
    Wraps an LLM structured-output call with retries and exponential backoff.
    If all retries fail and a fallback is provided, returns the fallback
    instead of raising — so one flaky LLM response can't crash the pipeline.
    """
    last_error = None

    for attempt in range(1, max_retries + 1):
        try:
            return invoke_fn()
        except Exception as e:
            last_error = e
            print(f"[LLM retry] Attempt {attempt}/{max_retries} failed: {e}")
            if attempt < max_retries:
                time.sleep(backoff_seconds * attempt)  # 2s, 4s, 6s...

    print(f"[LLM retry] All {max_retries} attempts failed. Last error: {last_error}")

    if fallback is not None:
        print("[LLM retry] Returning fallback response.")
        return fallback

    raise last_error