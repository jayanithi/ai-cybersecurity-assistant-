from bson import ObjectId
from datetime import datetime


# ============================================================
# SERIALIZE SINGLE MONGODB DOCUMENT
# ============================================================

def serialize_document(
    document
):

    if document is None:

        return None


    serialized = {}


    for key, value in document.items():

        if isinstance(
            value,
            ObjectId
        ):

            if key == "_id":

                serialized["id"] = str(
                    value
                )

            else:

                serialized[key] = str(
                    value
                )


        elif isinstance(
            value,
            datetime
        ):

            serialized[key] = (
                value.isoformat()
            )


        elif isinstance(
            value,
            list
        ):

            serialized[key] = [

                serialize_document(item)
                if isinstance(
                    item,
                    dict
                )
                else item

                for item in value

            ]


        elif isinstance(
            value,
            dict
        ):

            serialized[key] = (
                serialize_document(
                    value
                )
            )


        else:

            serialized[key] = value


    return serialized


# ============================================================
# SERIALIZE DOCUMENT LIST
# ============================================================

def serialize_documents(
    documents
):

    return [

        serialize_document(
            document
        )

        for document in documents

    ]