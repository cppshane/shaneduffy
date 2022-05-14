set -e

mongo <<EOF
use shaneduffy_database

db.createUser(
    {
        user: '$MONGO_SHANE_USERNAME',
        pwd: '$MONGO_SHANE_PASSWORD',
        roles: [
            {
                role: 'readWrite',
                db: 'shaneduffy_database'
            }
        ]
    }
)
db.createCollection("posts")

EOF