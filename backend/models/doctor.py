from database import db
from sqlalchemy.orm import relationship

class Doctor(db.Model):
    __tablename__ = 'doctor'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    specialization = db.Column(db.String(100), nullable=False)
    availability = db.Column(db.String(100))
    zego_user_id = db.Column(db.String(50), unique=True)  # Unique ZEGOCLOUD user ID for doctors
    
    # Relationship with appointments
    appointments = relationship("Appointment", backref="doctor", lazy=True)
    
    def __repr__(self):
        return f'<Doctor {self.name}>'