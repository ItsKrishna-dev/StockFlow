"""
app/core/email.py

Real-time transactional email delivery service.
Handles OTP emails with responsive HTML templates via SMTP.
Runs network I/O asynchronously in thread pools to avoid blocking the event loop.
"""
import asyncio
import smtplib
from email.message import EmailMessage

from app.core.config import settings


def _build_otp_html(otp_code: str, recipient_name: str | None = None) -> str:
    name_greeting = f"Hello {recipient_name}," if recipient_name else "Hello,"
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StockSense Password Reset OTP</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <!-- Brand Header -->
          <tr>
            <td style="padding: 32px 32px 20px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); text-align: center;">
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">StockSense</h1>
              <p style="margin: 6px 0 0; font-size: 14px; color: #e0e7ff; font-weight: 500;">Modular Inventory Management System</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.5; color: #cbd5e1;">{name_greeting}</p>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #94a3b8;">
                We received a request to reset the password for your StockSense account. Use the following One-Time Password (OTP) to proceed:
              </p>

              <!-- OTP Code Display Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center" style="background-color: #0f172a; border: 2px dashed #6366f1; border-radius: 12px; padding: 24px;">
                    <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #38bdf8; display: inline-block;">
                      {otp_code}
                    </span>
                    <p style="margin: 10px 0 0; font-size: 13px; color: #64748b; font-weight: 500;">
                      Valid for <strong>15 minutes</strong>
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                Enter this code in your password reset screen along with your new password.
              </p>

              <div style="background-color: #0f172a; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 12px 16px; margin: 24px 0 0;">
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #fbbf24;">
                  <strong>Security Note:</strong> If you did not request this password reset, please disregard this email or report it to your administrator immediately.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #0f172a; border-top: 1px solid #334155; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #64748b;">
                &copy; StockSense Inventory Platform &bull; Automated System Dispatch
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def _send_smtp_sync(to_email: str, subject: str, html_body: str, plain_body: str) -> None:
    """Synchronous SMTP worker function executed inside asyncio.to_thread."""
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{settings.MAIL_FROM_NAME} <{settings.email_from}>"
    msg["To"] = to_email
    msg.set_content(plain_body)
    msg.add_alternative(html_body, subtype="html")

    if not settings.MAIL_SERVER:
        raise ValueError("MAIL_SERVER is not configured in settings")

    # Connect via SSL (port 465) or STARTTLS (port 587)
    if settings.MAIL_PORT == 465:
        with smtplib.SMTP_SSL(settings.MAIL_SERVER, settings.MAIL_PORT, timeout=20) as server:
            if settings.MAIL_USERNAME and settings.MAIL_PASSWORD:
                server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
            server.send_message(msg)
    else:
        with smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT, timeout=20) as server:
            if settings.MAIL_TLS:
                server.starttls()
            if settings.MAIL_USERNAME and settings.MAIL_PASSWORD:
                server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
            server.send_message(msg)


async def send_otp_email(
    to_email: str,
    otp_code: str,
    user_name: str | None = None,
) -> bool:
    """
    Sends the 6-digit OTP code to the recipient's email in real-time.
    If mail credentials are configured in .env, sends via SMTP.
    If mail credentials are not configured, prints clear terminal dev instructions.
    """
    subject = f"Your StockSense Password Reset Code: {otp_code}"
    plain_body = (
        f"Hello {user_name or ''},\n\n"
        f"Your StockSense password reset OTP is: {otp_code}\n\n"
        f"This code will expire in 15 minutes.\n"
        f"If you did not request a password reset, please ignore this email."
    )
    html_body = _build_otp_html(otp_code, user_name)

    if settings.MAIL_SERVER and settings.MAIL_USERNAME and settings.MAIL_PASSWORD:
        try:
            await asyncio.to_thread(_send_smtp_sync, to_email, subject, html_body, plain_body)
            print(f"\n[REAL-TIME EMAIL] Successfully sent OTP email to: {to_email} via {settings.MAIL_SERVER}\n")
            return True
        except Exception as exc:
            print(f"\n[EMAIL ERROR] Failed to send email via SMTP ({settings.MAIL_SERVER}): {exc}\n")
            # Fallback to dev console so the user is never locked out
            print(f"[FALLBACK DEV OTP] OTP for {to_email}: {otp_code} (Valid for 15 mins)\n")
            return False
    else:
        # Development mode without SMTP credentials
        print(f"\n==================== [REAL-TIME OTP DISPATCH] ====================")
        print(f" Recipient: {to_email}")
        print(f" OTP Code : {otp_code}  (Valid for 15 mins)")
        print(f" Status   : Mail credentials not configured in .env.")
        print(f"            To send real emails to your Gmail inbox, set:")
        print(f"            MAIL_SERVER=smtp.gmail.com")
        print(f"            MAIL_PORT=587")
        print(f"            MAIL_USERNAME=your_email@gmail.com")
        print(f"            MAIL_PASSWORD=your_16_digit_app_password")
        print(f"            MAIL_FROM=your_email@gmail.com")
        print(f"===================================================================\n")
        return True


def _build_staff_credentials_html(
    staff_name: str,
    warehouse_name: str,
    email: str,
    login_id: str,
    password: str,
) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>StockFlow Staff Account Credentials</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f5f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1b1c1c;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f7f5f2; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #ffffff; border: 1px solid #e0d8dd; border-radius: 14px; overflow: hidden; box-shadow: 0 8px 30px rgba(87,52,79,0.12);">
          <tr>
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #714b67 0%, #57344f 100%); text-align: center; color: #ffffff;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">StockFlow</h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #f0bfe0; font-weight: 500;">Warehouse Management &amp; Operations</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 14px; font-size: 16px; font-weight: 600; color: #1b1c1c;">Hello {staff_name},</p>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #49454e;">
                You have been registered as a staff member assigned to <strong>{warehouse_name}</strong>. Here are your system login credentials:
              </p>
              <div style="background-color: #fcf9fb; border: 1px solid #ebd9e6; border-left: 5px solid #714b67; border-radius: 8px; padding: 18px 20px; margin: 20px 0;">
                <p style="margin: 0 0 8px; font-size: 13.5px; color: #49454e;"><strong>Assigned Warehouse:</strong> {warehouse_name}</p>
                <p style="margin: 0 0 8px; font-size: 13.5px; color: #49454e;"><strong>Email:</strong> {email}</p>
                <p style="margin: 0 0 8px; font-size: 13.5px; color: #49454e;"><strong>Login ID:</strong> {login_id}</p>
                <p style="margin: 0; font-size: 13.5px; color: #49454e;"><strong>Temporary Password:</strong> <code style="background: #eedfee; padding: 2px 8px; border-radius: 4px; font-family: monospace; font-size: 14px; font-weight: 700; color: #57344f;">{password}</code></p>
              </div>
              <p style="margin: 20px 0 0; font-size: 13.5px; line-height: 1.6; color: #6d6671;">
                Please sign in to the StockFlow Dashboard and change your password upon your first login.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px; background-color: #f7f5f2; border-top: 1px solid #ebd9e6; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #80747a;">
                &copy; StockFlow IMS &bull; Automated Staff Deployment
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


async def send_staff_credentials_email(
    to_email: str,
    staff_name: str,
    warehouse_name: str,
    password: str,
    login_id: str | None = None,
) -> bool:
    """
    Dispatches login credentials to newly created staff member via real-time SMTP.
    """
    clean_login_id = login_id or to_email
    subject = f"Welcome to StockFlow - Your Credentials for {warehouse_name}"
    plain_body = (
        f"Hello {staff_name},\n\n"
        f"You have been assigned as staff for {warehouse_name}.\n\n"
        f"Login Email: {to_email}\n"
        f"Login ID: {clean_login_id}\n"
        f"Temporary Password: {password}\n\n"
        f"Please log in and update your password.\n"
        f"- StockFlow Team"
    )
    html_body = _build_staff_credentials_html(
        staff_name=staff_name,
        warehouse_name=warehouse_name,
        email=to_email,
        login_id=clean_login_id,
        password=password,
    )
    if settings.MAIL_SERVER and settings.MAIL_USERNAME and settings.MAIL_PASSWORD:
        try:
            await asyncio.to_thread(_send_smtp_sync, to_email, subject, html_body, plain_body)
            print(f"\n[REAL-TIME EMAIL] Successfully sent staff credentials to: {to_email} via {settings.MAIL_SERVER}\n")
            return True
        except Exception as exc:
            print(f"\n[EMAIL ERROR] Failed to send credentials email ({settings.MAIL_SERVER}): {exc}\n")
            print(f"[FALLBACK CREDENTIALS] Staff {staff_name} ({to_email}) - Password: {password}\n")
            return False
    else:
        print(f"\n==================== [STAFF CREDENTIALS DISPATCH] ====================")
        print(f" Recipient : {to_email} ({staff_name})")
        print(f" Warehouse : {warehouse_name}")
        print(f" Login ID  : {clean_login_id}")
        print(f" Password  : {password}")
        print(f"======================================================================\n")
        return True

