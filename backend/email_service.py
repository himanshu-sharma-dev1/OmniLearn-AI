"""
Email Service - Uses SendGrid API (bypasses blocked SMTP ports)
Falls back to Flask-Mail for local development
"""

import os
import logging

logger = logging.getLogger(__name__)

# SendGrid API Key
SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY')
MAIL_DEFAULT_SENDER = os.environ.get('MAIL_USERNAME', 'noreply@omnilearn.himanshu-sharma.me')


def send_email(to_email: str, subject: str, html_content: str) -> bool:
    """
    Send email using SendGrid API (preferred) or Flask-Mail (fallback)
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        html_content: HTML body of the email
        
    Returns:
        True if email sent successfully, False otherwise
    """
    
    # Try SendGrid first (works on DigitalOcean without SMTP ports)
    if SENDGRID_API_KEY:
        return _send_via_sendgrid(to_email, subject, html_content)
    
    # Fallback to Flask-Mail SMTP (for local development)
    return _send_via_flask_mail(to_email, subject, html_content)


def _send_via_flask_mail(to_email: str, subject: str, html_content: str) -> bool:
    """Send email using Flask-Mail SMTP (for local development)"""
    try:
        from flask import current_app
        from flask_mail import Message
        
        # Import mail instance from app
        from app import mail
        
        msg = Message(
            subject=subject,
            recipients=[to_email],
            html=html_content
        )
        mail.send(msg)
        logger.info(f"Email sent successfully to {to_email} via Flask-Mail SMTP")
        return True
    except Exception as e:
        logger.error(f"Flask-Mail SMTP error: {e}", exc_info=True)
        logger.warning("Set SENDGRID_API_KEY for production email delivery")
        return False


def _send_via_sendgrid(to_email: str, subject: str, html_content: str) -> bool:
    """Send email using SendGrid API"""
    try:
        import sendgrid
        from sendgrid.helpers.mail import Mail, Email, To, Content
        
        sg = sendgrid.SendGridAPIClient(api_key=SENDGRID_API_KEY)
        
        message = Mail(
            from_email=Email(MAIL_DEFAULT_SENDER),
            to_emails=To(to_email),
            subject=subject,
            html_content=Content("text/html", html_content)
        )
        
        response = sg.send(message)
        
        if response.status_code in [200, 201, 202]:
            logger.info(f"Email sent successfully to {to_email} via SendGrid")
            return True
        else:
            logger.error(f"SendGrid returned status {response.status_code}: {response.body}")
            return False
            
    except Exception as e:
        logger.error(f"SendGrid error: {e}", exc_info=True)
        return False


def send_password_reset_email(to_email: str, reset_url: str) -> bool:
    """Send password reset email with nice formatting"""
    
    subject = "🔐 Password Reset Request - OmniLearn"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; padding: 20px; }}
            .container {{ max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }}
            .header {{ text-align: center; margin-bottom: 20px; }}
            .logo {{ font-size: 28px; font-weight: bold; background: linear-gradient(135deg, #6366f1, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }}
            .button {{ display: inline-block; background: linear-gradient(135deg, #6366f1, #a855f7); color: white !important; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }}
            .footer {{ color: #888; font-size: 12px; text-align: center; margin-top: 30px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🎓 OmniLearn</div>
            </div>
            <h2>Password Reset Request</h2>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <p style="text-align: center;">
                <a href="{reset_url}" class="button">Reset My Password</a>
            </p>
            <p style="color: #666; font-size: 14px;">
                If you didn't request this, you can safely ignore this email. The link expires in 1 hour.
            </p>
            <p style="word-break: break-all; font-size: 12px; color: #888;">
                Or copy this link: {reset_url}
            </p>
            <div class="footer">
                &copy; 2024 OmniLearn - AI-Powered Study Companion
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(to_email, subject, html_content)
