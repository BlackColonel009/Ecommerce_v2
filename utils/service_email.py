"""Service d'e-mails transactionnels et marketing de New Technologies."""

from __future__ import annotations

from html import escape
import logging
from typing import Iterable
from urllib.parse import urlparse

from fastapi_mail import FastMail, MessageSchema
from pydantic import EmailStr

from utils.email_utils import email_config, email_settings


logger = logging.getLogger(__name__)


class EmailService:
    """Construit des e-mails lisibles sur mobile et les envoie individuellement."""

    def __init__(self):
        self.fastmail = FastMail(email_config)
        self.frontend_url = email_settings.FRONTEND_URL.rstrip("/")

    @staticmethod
    def _safe_url(url: str | None, fallback: str) -> str:
        candidate = (url or fallback).strip()
        parsed = urlparse(candidate)
        return candidate if parsed.scheme in {"http", "https"} else fallback

    @staticmethod
    def _paragraphs(text: str) -> str:
        safe_text = escape((text or "").strip())
        return "<br>".join(safe_text.splitlines()) or "&nbsp;"

    def _layout(
        self,
        *,
        eyebrow: str,
        title: str,
        greeting: str,
        content: str,
        cta_label: str | None = None,
        cta_url: str | None = None,
        note: str | None = None,
    ) -> str:
        button = ""
        if cta_label:
            button = f'''<tr><td align="center" style="padding:8px 0 8px;">
                <a href="{escape(self._safe_url(cta_url, self.frontend_url), quote=True)}" style="background:#ed0012;border-radius:8px;color:#ffffff;display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;line-height:20px;padding:14px 24px;text-decoration:none;">{escape(cta_label)}</a>
            </td></tr>'''
        note_block = ""
        if note:
            note_block = f'''<tr><td style="background:#fff8d8;border-left:4px solid #edd500;border-radius:6px;color:#333333;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;padding:14px 16px;">{note}</td></tr>'''

        return f'''<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#f4f5f7;margin:0;padding:0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f5f7;"><tr><td align="center" style="padding:28px 12px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;border-radius:14px;max-width:620px;overflow:hidden;">
      <tr><td style="background:#141414;padding:25px 30px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
          <td style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:19px;font-weight:800;letter-spacing:-.3px;">NEW <span style="color:#edd500;">TECHNOLOGIES</span></td>
          <td align="right" style="color:#edd500;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">{escape(eyebrow)}</td>
        </tr></table>
      </td></tr>
      <tr><td style="background:linear-gradient(135deg,#ed0012,#b9000e);height:5px;line-height:5px;font-size:5px;">&nbsp;</td></tr>
      <tr><td style="padding:34px 30px 20px;">
        <h1 style="color:#171717;font-family:Arial,Helvetica,sans-serif;font-size:27px;letter-spacing:-.5px;line-height:34px;margin:0 0 18px;">{escape(title)}</h1>
        <p style="color:#242424;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:25px;margin:0 0 14px;">{escape(greeting)}</p>
        <div style="color:#505050;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;">{content}</div>
      </td></tr>
      {button}
      <tr><td style="padding:12px 30px 28px;">{note_block}</td></tr>
      <tr><td style="background:#f0f1f3;border-top:1px solid #e3e4e7;padding:20px 30px;text-align:center;">
        <p style="color:#555b65;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;margin:0;">New Technologies · Technologie, informatique et sécurité à Lomé</p>
        <p style="color:#818792;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;margin:6px 0 0;">Cet e-mail a été envoyé par New Technologies. Besoin d’aide ? Répondez directement à ce message.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>'''

    async def send_email(
        self, recipients: list[EmailStr], subject: str, body: str, subtype: str = "html"
    ) -> bool:
        try:
            message = MessageSchema(subject=subject, recipients=recipients, body=body, subtype=subtype)
            await self.fastmail.send_message(message)
            logger.info("E-mail envoyé à %s", recipients)
            return True
        except Exception:
            logger.exception("Erreur d’envoi d’e-mail à %s", recipients)
            return False

    async def send_newsletter_welcome(
        self, email: EmailStr, bonus_amount: str = "10 000 XOF", bonus_code: str | None = None
    ) -> bool:
        code_line = f"<br><strong>Votre code : {escape(bonus_code)}</strong>" if bonus_code else ""
        content = f'''<p style="margin:0 0 14px;">Merci de rejoindre notre communauté. Vous recevrez en priorité nos nouveautés, nos bons plans et nos conseils pour mieux choisir votre matériel.</p>
        <p style="margin:0 0 18px;">Pour vous souhaiter la bienvenue, nous vous réservons <strong>{escape(bonus_amount)}</strong> sur votre premier achat.{code_line}</p>'''
        return await self.send_email(
            recipients=[email],
            subject="Bienvenue chez New Technologies — votre avantage vous attend",
            body=self._layout(
                eyebrow="Newsletter",
                title="Bienvenue dans la communauté !",
                greeting="Bonjour,",
                content=content,
                cta_label="Découvrir les offres",
                cta_url=self.frontend_url,
                note="Conservez ce message et indiquez votre code lors de votre commande via WhatsApp.",
            ),
        )

    async def send_welcome_email(self, email: EmailStr, username: str) -> bool:
        content = '''<p style="margin:0 0 14px;">Votre compte est prêt. Vous pouvez dès maintenant enregistrer vos favoris, préparer votre panier et suivre vos commandes.</p>
        <p style="margin:0;">Notre équipe reste disponible pour vous aider à choisir l’équipement adapté à vos besoins.</p>'''
        return await self.send_email(
            recipients=[email],
            subject="Bienvenue chez New Technologies",
            body=self._layout(
                eyebrow="Votre compte",
                title="Votre compte est créé !",
                greeting=f"Bonjour {username},",
                content=content,
                cta_label="Commencer mes achats",
                cta_url=self.frontend_url,
            ),
        )

    async def send_support_reply(
        self, email: EmailStr, customer_name: str, original_subject: str, reply: str
    ) -> bool:
        content = f'''<p style="margin:0 0 16px;">Notre équipe a répondu à votre demande concernant : <strong>{escape(original_subject)}</strong>.</p>
        <div style="background:#f4f5f7;border-radius:8px;color:#333333;margin:0;padding:18px;">{self._paragraphs(reply)}</div>
        <p style="margin:16px 0 0;">Si vous avez une autre question, répondez simplement à cet e-mail.</p>'''
        return await self.send_email(
            recipients=[email],
            subject="New Technologies — réponse à votre demande",
            body=self._layout(
                eyebrow="Support client",
                title="Notre réponse est arrivée",
                greeting=f"Bonjour {customer_name},",
                content=content,
                cta_label="Visiter la boutique",
                cta_url=self.frontend_url,
            ),
        )

    async def send_bonus_used_thank_you(
        self, email: EmailStr, bonus_amount: str, bonus_code: str | None
    ) -> bool:
        code_line = (
            f"<br>Le code <strong>{escape(bonus_code)}</strong> a été marqué comme utilisé."
            if bonus_code
            else ""
        )
        content = f'''<p style="margin:0 0 14px;">Merci pour votre premier achat chez New Technologies. Nous espérons que votre équipement vous donnera entière satisfaction.</p>
        <p style="margin:0;">Votre avantage de bienvenue de <strong>{escape(bonus_amount)}</strong> a bien été utilisé.{code_line}</p>'''
        return await self.send_email(
            recipients=[email],
            subject="Merci pour votre premier achat chez New Technologies",
            body=self._layout(
                eyebrow="Merci pour votre confiance",
                title="Votre avantage a bien été utilisé",
                greeting="Bonjour,",
                content=content,
                cta_label="Découvrir nos nouveautés",
                cta_url=self.frontend_url,
            ),
        )

    async def send_newsletter_campaign(
        self,
        recipients: Iterable[EmailStr],
        subject: str,
        title: str,
        message: str,
        cta_label: str = "Voir les offres",
        cta_url: str | None = None,
    ) -> int:
        """Envoie la campagne destinataire par destinataire pour préserver les adresses."""
        safe_subject = (subject or "Les offres New Technologies").strip()[:160]
        html = self._layout(
            eyebrow="Offres et nouveautés",
            title=(title or "Nos offres du moment").strip()[:120],
            greeting="Bonjour,",
            content=f'<p style="margin:0;">{self._paragraphs(message)}</p>',
            cta_label=(cta_label or "Voir les offres").strip()[:60],
            cta_url=cta_url or self.frontend_url,
        )
        sent = 0
        for recipient in recipients:
            if await self.send_email([recipient], safe_subject, html):
                sent += 1
        logger.info("Campagne newsletter terminée : %s e-mail(s) envoyé(s)", sent)
        return sent


email_service = EmailService()
