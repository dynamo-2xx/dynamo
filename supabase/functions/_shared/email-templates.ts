// §16 — Transactional templates. Each function returns { subject, html, text,
// category } so the caller can route through _shared/email.ts:sendEmail().
import { brandedShell } from "./email.ts";

const APP = "https://dynamo.today";

export type Tpl = { subject: string; html: string; text: string; category: "essential" | "marketing" };

const p = (s: string) => `<p style="margin:0 0 12px 0;">${s}</p>`;
const a = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:#0a0a0a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:500;">${label}</a>`;

// ── Auth ─────────────────────────────────────────────────────────────────
export const authVerify = (link: string): Tpl => ({
  category: "essential",
  subject: "Verify your Dynamo email",
  text: `Verify your email: ${link}`,
  html: brandedShell({
    title: "Verify your email",
    bodyHtml: p("Tap the button below to confirm this is your inbox.") + a(link, "Verify email") +
      `<div style="margin-top:16px;font-size:12px;color:#6b7280;">If you didn't sign up, ignore this email.</div>`,
  }),
});

export const authMagicLink = (link: string): Tpl => ({
  category: "essential",
  subject: "Your Dynamo sign-in link",
  text: `Sign in: ${link}`,
  html: brandedShell({
    title: "Sign in to Dynamo",
    bodyHtml: p("One tap signs you in. This link expires in 15 minutes.") + a(link, "Sign in"),
  }),
});

export const authPasswordReset = (link: string): Tpl => ({
  category: "essential",
  subject: "Reset your Dynamo password",
  text: `Reset password: ${link}`,
  html: brandedShell({
    title: "Password reset",
    bodyHtml: p("Reset your password with the button below. Link expires in 1 hour.") + a(link, "Reset password"),
  }),
});

// ── Invites ──────────────────────────────────────────────────────────────
export const inviteDebate = (args: { inviterName: string; sessionTitle: string; joinLink: string; format: string }): Tpl => ({
  category: "essential",
  subject: `${args.inviterName} invited you to a ${args.format}`,
  text: `${args.inviterName} invited you to "${args.sessionTitle}". Join: ${args.joinLink}`,
  html: brandedShell({
    title: `${args.inviterName} wants you in`,
    bodyHtml: p(`<strong>${args.sessionTitle}</strong>`) + p(`Format: ${args.format}`) + a(args.joinLink, "Open invitation"),
  }),
});

export const inviteAccepted = (args: { accepterName: string; sessionTitle: string; sessionLink: string }): Tpl => ({
  category: "essential",
  subject: `${args.accepterName} accepted your invite`,
  text: `${args.accepterName} joined "${args.sessionTitle}". ${args.sessionLink}`,
  html: brandedShell({
    title: `${args.accepterName} is in`,
    bodyHtml: p(`They accepted your invite to <strong>${args.sessionTitle}</strong>.`) + a(args.sessionLink, "Open session"),
  }),
});

// ── Clubs ────────────────────────────────────────────────────────────────
export const clubJoinApproved = (args: { clubName: string; clubLink: string }): Tpl => ({
  category: "essential",
  subject: `Welcome to ${args.clubName}`,
  text: `You're in: ${args.clubName} — ${args.clubLink}`,
  html: brandedShell({
    title: `You're in: ${args.clubName}`,
    bodyHtml: p("Your join request was approved.") + a(args.clubLink, "Open club"),
  }),
});

export const clubEventAnnounced = (args: { clubName: string; eventTitle: string; eventLink: string; whenLabel: string }): Tpl => ({
  category: "marketing",
  subject: `${args.clubName}: ${args.eventTitle}`,
  text: `${args.eventTitle} (${args.whenLabel}) — ${args.eventLink}`,
  html: brandedShell({
    title: args.eventTitle,
    bodyHtml: p(`<strong>${args.clubName}</strong> · ${args.whenLabel}`) + a(args.eventLink, "View event"),
    footerNote: `Sent because you're a member of ${args.clubName}. <a href="${APP}/settings/email" style="color:#6b7280;">Manage email preferences</a>.`,
  }),
});

// ── Safety ───────────────────────────────────────────────────────────────
export const reportAcknowledged = (args: { reportRef: string }): Tpl => ({
  category: "essential",
  subject: "We received your report",
  text: `Report ${args.reportRef} received.`,
  html: brandedShell({
    title: "Report received",
    bodyHtml: p(`Reference: <code>${args.reportRef}</code>`) + p("We'll review and act if it violates our guidelines."),
  }),
});

export const sanctionNotice = (args: { actionLabel: string; reason: string; appealLink: string }): Tpl => ({
  category: "essential",
  subject: `Action taken on your account: ${args.actionLabel}`,
  text: `${args.actionLabel} — reason: ${args.reason}. Appeal: ${args.appealLink}`,
  html: brandedShell({
    title: args.actionLabel,
    bodyHtml: p(`Reason: ${args.reason}`) + p("You can appeal this decision.") + a(args.appealLink, "Submit an appeal"),
  }),
});

export const appealDecision = (args: { outcome: string; rationale: string }): Tpl => ({
  category: "essential",
  subject: `Appeal decision: ${args.outcome}`,
  text: `${args.outcome} — ${args.rationale}`,
  html: brandedShell({
    title: `Appeal: ${args.outcome}`,
    bodyHtml: p(args.rationale),
  }),
});

// ── Billing ──────────────────────────────────────────────────────────────
export const paymentReceipt = (args: { amount: string; planName: string; invoiceLink: string }): Tpl => ({
  category: "essential",
  subject: `Receipt: ${args.amount} — Dynamo ${args.planName}`,
  text: `Receipt for ${args.amount}: ${args.invoiceLink}`,
  html: brandedShell({
    title: "Payment received",
    bodyHtml: p(`Plan: <strong>${args.planName}</strong>`) + p(`Amount: <strong>${args.amount}</strong>`) + a(args.invoiceLink, "View invoice"),
  }),
});

export const paymentFailed = (args: { planName: string; updateLink: string; retryDate: string }): Tpl => ({
  category: "essential",
  subject: "Payment failed — please update your card",
  text: `Payment failed for ${args.planName}. Update card: ${args.updateLink}`,
  html: brandedShell({
    title: "Payment failed",
    bodyHtml: p(`We couldn't charge your card for <strong>${args.planName}</strong>.`) + p(`Next retry: ${args.retryDate}`) + a(args.updateLink, "Update payment method"),
  }),
});

// ── Founder cost alert ───────────────────────────────────────────────────
export const costAlert = (args: { source: string; pct: number; spend: string; budget: string }): Tpl => ({
  category: "essential",
  subject: `[Dynamo costs] ${args.source} at ${args.pct}%`,
  text: `${args.source} ${args.spend}/${args.budget} (${args.pct}%)`,
  html: brandedShell({
    title: `${args.source} at ${args.pct}%`,
    bodyHtml: p(`Month-to-date: <strong>${args.spend}</strong> of <strong>${args.budget}</strong>.`) + a(`${APP}/admin/costs`, "Open dashboard"),
  }),
});