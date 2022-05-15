set -e

mongo <<EOF
use shaneduffy_database

db.createUser(
    {
        user: 'shane',
        pwd: 'password',
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