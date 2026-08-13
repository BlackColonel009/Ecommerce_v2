from pydantic import BaseModel
from pydantic import Field, field_validator

class VisitorCreate(BaseModel):
    device_id: str
    source: str = "Direct"


class VisitorFirstNameUpdate(BaseModel):
    first_name: str = Field(min_length=2, max_length=80)

    @field_validator("first_name")
    @classmethod
    def normalize_first_name(cls, value: str) -> str:
        cleaned = " ".join(value.split())
        if not cleaned or not any(character.isalpha() for character in cleaned):
            raise ValueError("Veuillez indiquer un prénom valide.")
        return cleaned
