from database import db
from werkzeug.security import generate_password_hash, check_password_hash
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class User(db.Model):
    __tablename__ = 'user'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    
    def __init__(self, email):
        self.email = email
    
    def set_password(self, password):
        logger.debug("Setting password for user: %s", self.email)
        self.password_hash = generate_password_hash(password)
        logger.info("Password set successfully for user: %s", self.email)
    
    def check_password(self, password):
        logger.debug("Checking password for user: %s", self.email)
        result = check_password_hash(self.password_hash, password)
        logger.info("Password check result for user %s: %s", self.email, result)
        return result
    
    def __repr__(self):
        return f'<User {self.email}>'