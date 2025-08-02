from typing import *


from pydantic import BaseModel, Field
from beanie import PydanticObjectId


ModelEntityName = Literal[
    'PERSON',
    'ORGANIZATION',
    'PRODUCT',
    'NRP',
    'LOCATION',
]


class BasePii(BaseModel):
    id: PydanticObjectId | None = Field(alias='_id', default=None)
    entity: str
    description: str
    origin: Literal['model', 'regex'] = 'regex'
    prerecognition_entity: str | None = None
    languages: list[str] | None = Field(default_factory=lambda: ['*'])


predefined_pii_entities = {
    'PERSON': BasePii(
        entity='PERSON',
        description='A full person name, which can include first names, middle names or initials, and last names.',
        origin='model',
        languages=['*'],
    ),
    'ORGANIZATION': BasePii(
        entity='ORGANIZATION',
        description='Companies, agencies, institutions etc.',
        origin='model',
        languages=['*'],
    ),
    'PRODUCT': BasePii(
        entity='PRODUCT',
        description='Objects, vehicles, foods etc. (not services).',
        origin='model',
        languages=['*'],
    ),
    'NRP': BasePii(
        entity='NRP',
        description='A person’s Nationality, religious or political group.',
        origin='model',
        languages=['*'],
    ),
    'LOCATION': BasePii(
        entity='LOCATION',
        description='Name of politically or geographically defined location (cities, provinces, countries, international regions, bodies of water, mountains',
        origin='model',
        languages=['*'],
    ),
    #
    'CREDIT_CARD': BasePii(
        entity='CREDIT_CARD',
        description='A credit card number is between 12 to 19 digits.',
        origin='regex',
        languages=['*'],
    ),
    'CRYPTO': BasePii(
        entity='CRYPTO',
        description='A Crypto wallet number. Currently only Bitcoin address is supported',
        origin='regex',
        languages=['*'],
    ),
    'DATE_TIME': BasePii(
        entity='DATE_TIME',
        description='Absolute or relative dates or periods or times smaller than a day.',
        origin='regex',
        languages=['*'],
    ),
    'EMAIL_ADDRESS': BasePii(
        entity='EMAIL_ADDRESS',
        description='An email address identifies an email box to which email messages are delivered',
        origin='regex',
        languages=['*'],
    ),
    'IBAN_CODE': BasePii(
        entity='IBAN_CODE',
        description='The International Bank Account Number (IBAN) is an internationally agreed system of identifying bank accounts across national borders to facilitate the communication and processing of cross border transactions with a reduced risk of transcription errors.',
        origin='regex',
        languages=['*'],
    ),
    'IP_ADDRESS': BasePii(
        entity='IP_ADDRESS',
        description='An Internet Protocol (IP) address (either IPv4 or IPv6).',
        origin='regex',
        languages=['*'],
    ),
    'PHONE_NUMBER': BasePii(
        entity='PHONE_NUMBER',
        description='A telephone number',
        origin='regex',
        languages=['*'],
    ),
    'MEDICAL_LICENSE': BasePii(
        entity='MEDICAL_LICENSE',
        description='Common medical license numbers.',
        origin='regex',
        languages=['*'],
    ),
    'URL': BasePii(
        entity='URL',
        description='A URL (Uniform Resource Locator), unique identifier used to locate a resource on the Internet',
        origin='regex',
        languages=['*'],
    ),
    #
    'US_BANK_NUMBER': BasePii(
        entity='US_BANK_NUMBER',
        description='A US bank account number is between 8 to 17 digits.',
        origin='regex',
        languages=['en'],
    ),
    'US_DRIVER_LICENSE': BasePii(
        entity='US_DRIVER_LICENSE',
        description='A US driver license according to https://ntsi.com/drivers-license-format/',
        origin='regex',
        languages=['en'],
    ),
    'US_ITIN': BasePii(
        entity='US_ITIN',
        description="US Individual Taxpayer Identification Number (ITIN). Nine digits that start with a '9' and contain a '7' or '8'as the 4 digit.",
        origin='regex',
        languages=['en'],
    ),
    'US_PASSPORT': BasePii(
        entity='US_PASSPORT',
        description='A US passport number with 9 digits.',
        origin='regex',
        languages=['en'],
    ),
    'US_SSN': BasePii(
        entity='US_SSN',
        description='A US Social Security Number (SSN) with 9 digits.',
        origin='regex',
        languages=['en'],
    ),
    'UK_NHS': BasePii(
        entity='UK_NHS',
        description='A UK NHS number is 10 digits.',
        origin='regex',
        languages=['en'],
    ),
    #
    'ES_NIF': BasePii(
        entity='ES_NIF',
        description='A spanish NIF number (Personal tax ID).',
        origin='regex',
        languages=['es'],
    ),
    #
    'IT_FISCAL_CODE': BasePii(
        entity='IT_FISCAL_CODE',
        description='An Italian personal identification code.',
        origin='regex',
        languages=['it'],
    ),
    'IT_DRIVER_LICENSE': BasePii(
        entity='IT_DRIVER_LICENSE',
        description='An Italian driver license number.',
        origin='regex',
        languages=['it'],
    ),
    'IT_VAT_CODE': BasePii(
        entity='IT_VAT_CODE',
        description='An Italian VAT code number.',
        origin='regex',
        languages=['it'],
    ),
    'IT_PASSPORT': BasePii(
        entity='IT_PASSPORT',
        description='An Italian passport number.',
        origin='regex',
        languages=['it'],
    ),
    'IT_IDENTITY_CARD': BasePii(
        entity='IT_IDENTITY_CARD',
        description='An Italian identity card number.',
        origin='regex',
        languages=['it'],
    ),
    #
    'PL_PESEL': BasePii(
        entity='PL_PESEL',
        description='Polish PESEL number',
        origin='regex',
        languages=['pl'],
    ),
    #
    'SG_NRIC_FIN': BasePii(
        entity='SG_NRIC_FIN',
        description='A National Registration Identification Card',
        origin='regex',
        languages=['en'],
    ),
    'SG_UEN': BasePii(
        entity='SG_UEN',
        description='A Unique Entity Number (UEN) is a standard identification number for entities registered in Singapore.',
        origin='regex',
        languages=['en'],
    ),
    #
    'AU_ABN': BasePii(
        entity='AU_ABN',
        description='The Australian Business Number (ABN) is a unique 11 digit identifier issued to all entities registered in the Australian Business Register (ABR).',
        origin='regex',
        languages=['en'],
    ),
    'AU_ACN': BasePii(
        entity='AU_ACN',
        description='An Australian Company Number is a unique nine-digit number issued by the Australian Securities and Investments Commission to every company registered under the Commonwealth Corporations Act 2001 as an identifier.',
        origin='regex',
        languages=['en'],
    ),
    'AU_TFN': BasePii(
        entity='AU_TFN',
        description='The tax file number (TFN) is a unique identifier issued by the Australian Taxation Office to each taxpaying entity',
        origin='regex',
        languages=['en'],
    ),
    'AU_MEDICARE': BasePii(
        entity='AU_MEDICARE',
        description="Medicare number is a unique identifier issued by Australian Government that enables the cardholder to receive a rebates of medical expenses under Australia's Medicare system",
        origin='regex',
        languages=['en'],
    ),
    #
    'IN_PAN': BasePii(
        entity='IN_PAN',
        description='The Indian Permanent Account Number (PAN) is a unique 12 character alphanumeric identifier issued to all business and individual entities registered as Tax Payers.',
        origin='regex',
        languages=['en'],
    ),
    'IN_AADHAAR': BasePii(
        entity='IN_AADHAAR',
        description='Indian government issued unique 12 digit individual identity number',
        origin='regex',
        languages=['en'],
    ),
    'IN_VEHICLE_REGISTRATION': BasePii(
        entity='IN_VEHICLE_REGISTRATION',
        description='Indian government issued transport (govt, personal, diplomatic, defence) vehicle registration number',
        origin='regex',
        languages=['en'],
    ),
}
