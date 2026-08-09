# services/email.py
from fastapi_mail import FastMail, MessageSchema
from pydantic import EmailStr
from utils.email_utils import email_config, email_settings
import logging

# Configuration du logging
logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.fastmail = FastMail(email_config)
        self.frontend_url = email_settings.FRONTEND_URL

    async def send_email(
        self,
        recipients: list[EmailStr],
        subject: str,
        body: str,
        subtype: str = "html"
    ) -> bool:
        """
        Envoie un email générique
        """
        try:
            message = MessageSchema(
                subject=subject,
                recipients=recipients,
                body=body,
                subtype=subtype
            )
            
            await self.fastmail.send_message(message)
            logger.info(f"✅ Email envoyé à {recipients}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erreur envoi email à {recipients}: {str(e)}")
            return False

    async def send_newsletter_welcome(self, email: EmailStr, bonus_amount: str = "10000 FCFA"):
        """
        Email de bienvenue pour inscription newsletter
        """
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 20px;
                    text-align: center;
                    border-radius: 10px 10px 0 0;
                }}
                .content {{
                    background: #f9f9f9;
                    padding: 30px;
                    border: 1px solid #ddd;
                }}
                .bonus {{
                    background: #4CAF50;
                    color: white;
                    padding: 15px;
                    text-align: center;
                    border-radius: 5px;
                    font-size: 24px;
                    margin: 20px 0;
                }}
                .footer {{
                    text-align: center;
                    margin-top: 20px;
                    color: #666;
                    font-size: 12px;
                }}
                .btn {{
                    display: inline-block;
                    padding: 10px 20px;
                    background: #667eea;
                    color: white;
                    text-decoration: none;
                    border-radius: 5px;
                    margin-top: 15px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Bienvenue chez New Technologies !</h1>
                </div>
                <div class="content">
                    <p>Bonjour,</p>
                    <p>Merci de vous être inscrit à notre newsletter. Vous recevrez désormais :</p>
                    <ul>
                        <li>✨ Nos dernières offres exclusives</li>
                        <li>🚀 Les nouveautés produits</li>
                        <li>💡 Conseils et astuces tech</li>
                        <li>🎁 Événements spéciaux</li>
                    </ul>
                    
                    <div class="bonus">
                        🎁 Votre bonus de bienvenue : <strong>{bonus_amount}</strong>
                    </div>
                    
                    <p>Ce bonus est valable sur votre premier achat. Il vous suffit de nous contacter via WhatsApp directement depuis votre panier pour l'utiliser !</p>
                    
                    <center>
                        <a href="{self.frontend_url}" class="btn">Découvrir nos produits</a>
                    </center>
                </div>
                <div class="footer">
                    <p>© 2024 New Technologies - Tous droits réservés</p>
                    <p>Bê, KPEHENOU, Lomé-Togo</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(
            recipients=[email],
            subject="Bienvenue sur New Technologies 🎉",
            body=html
        )

    async def send_password_reset(self, email: EmailStr, reset_token: str):
        """
        Email de réinitialisation de mot de passe
        """
        reset_link = f"{self.frontend_url}/reset-password?token={reset_token}"
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: #dc3545;
                    color: white;
                    padding: 20px;
                    text-align: center;
                    border-radius: 10px 10px 0 0;
                }}
                .content {{
                    background: #f9f9f9;
                    padding: 30px;
                    border: 1px solid #ddd;
                }}
                .reset-btn {{
                    display: inline-block;
                    padding: 12px 30px;
                    background: #007bff;
                    color: white;
                    text-decoration: none;
                    border-radius: 5px;
                    font-weight: bold;
                    margin: 20px 0;
                }}
                .warning {{
                    background: #fff3cd;
                    border: 1px solid #ffeeba;
                    color: #856404;
                    padding: 10px;
                    border-radius: 5px;
                    font-size: 14px;
                    margin-top: 20px;
                }}
                .footer {{
                    text-align: center;
                    margin-top: 20px;
                    color: #666;
                    font-size: 12px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 Réinitialisation de mot de passe</h1>
                </div>
                <div class="content">
                    <p>Bonjour,</p>
                    <p>Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte.</p>
                    
                    <center>
                        <a href="{reset_link}" class="reset-btn">Réinitialiser mon mot de passe</a>
                    </center>
                    
                    <div class="warning">
                        ⚠️ Ce lien expirera dans 24 heures. Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email.
                    </div>
                    
                    <p>Ou copiez ce lien dans votre navigateur :</p>
                    <p style="word-break: break-all; color: #666;">{reset_link}</p>
                </div>
                <div class="footer">
                    <p>© 2024 New Technologies - Tous droits réservés</p>
                    <p>Email envoyé à {email}</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(
            recipients=[email],
            subject="🔐 Réinitialisation de votre mot de passe",
            body=html
        )

    async def send_welcome_email(self, email: EmailStr, username: str):
        """
        Email de bienvenue après inscription
        """
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: #28a745;
                    color: white;
                    padding: 20px;
                    text-align: center;
                    border-radius: 10px 10px 0 0;
                }}
                .content {{
                    background: #f9f9f9;
                    padding: 30px;
                    border: 1px solid #ddd;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>👋 Bienvenue {username} !</h1>
                </div>
                <div class="content">
                    <p>Votre compte a été créé avec succès sur New Technologies.</p>
                    <p>Vous pouvez maintenant :</p>
                    <ul>
                        <li>🛍️ Passer des commandes</li>
                        <li>⭐ Laisser des avis</li>
                        <li>❤️ Ajouter des produits aux favoris</li>
                        <li>📦 Suivre vos commandes</li>
                    </ul>
                    <center>
                        <a href="{self.frontend_url}" style="display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">
                            Commencer mes achats
                        </a>
                    </center>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(
            recipients=[email],
            subject="👋 Bienvenue sur New Technologies",
            body=html
        )

# Instance globale du service email
email_service = EmailService()