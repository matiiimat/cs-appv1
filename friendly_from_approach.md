
# 💬 Friendly From Approach ("Acme Support" <support@aidly.me>)

## 🎯 Goal
Fastest, zero-DNS-change approach — the sender address stays shared, but the display name changes per customer.

---

## ⚙️ What You’ll Need

### A. Backend Logic Only
No DNS or SendGrid setup changes are needed.

Just dynamically set the **display name** in the `from` field:

```js
await sendgrid.send({
  to,
  from: {
    email: "support@aidly.me",
    name: `${orgName} Support`
  },
  subject,
  html: htmlContent,
});
```

Where `orgName` is the customer’s company name.

---

### B. Optional Enhancements
- For replies, you can still route based on `reply-to` header:
  ```
  reply_to: `support+${orgId}@aidly.me`
  ```
  That way, inbound replies still reach the right mailbox even if the visible “From” is shared.

- You can even customize per email template:
  ```
  From: "Acme Billing" <support@aidly.me>
  From: "Acme Technical Support" <support@aidly.me>
  ```

---

## ✅ Result
Your users see:
```
From: "Acme Support" <support@aidly.me>
```
It looks more personal and professional even though it’s technically the same sending address.

---

## ⚖️ Summary

| Feature | Friendly From |
|----------|----------------|
| **Setup time** | Instant |
| **Look in inbox** | Semi-branded (`"Acme Support" <support@aidly.me>`) |
| **Deliverability** | Slightly weaker |
| **Scaling** | Trivial |
| **Customer DNS setup** | None |
