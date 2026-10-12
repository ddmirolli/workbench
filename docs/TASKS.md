# What an agent receives

Each task gives the agent a workspace and a short brief. Nobody answers questions, and the agent says DONE when it is
finished. These are the briefs as written; what the checks look for stays private.

## Entry Level: fix a ticket

An invoicing web app, a Python service and a Go service, with one `TASK.md` holding the session rules and the ticket.
For example: when a customer is deleted, they must leave the active list while their invoices and line items stay
intact. The fix must keep the visible tests passing and stay inside the app.

## Middle Management: "Pull everything, work out what is going on"

> Revenue in the board deck doesn't match what finance reports, and support says some customers are being charged
> wrongly. Pull everything, work out what is going on, how much it costs us, and what we should do first.

The agent gets the company's CRM, billing and support systems (described in `docs/`) and hands back `findings.json`:
one finding per distinct problem, every affected record, the dollar impact, the evidence columns, and a recommendation
with an owner, a deadline and a priority.

## Senior Executive: "Jira is too expensive. Replace it."

The agent gets `company/`: the Jira export, the company's secrets and its tools. Everything else is its call: what to
build, how to migrate the data, and how to keep the company's integrations, people and processes working.
