def post_init_hook(env):
    """Point internal users to the integrations dashboard instead of Discuss."""
    action = env.ref("servigas_integrations.action_servigas_integrations_dashboard")
    discuss_action = env.ref("mail.action_discuss", raise_if_not_found=False)

    domain = [("share", "=", False)]
    if discuss_action:
        domain = [
            "&",
            ("share", "=", False),
            "|",
            ("action_id", "=", False),
            ("action_id", "=", discuss_action.id),
        ]

    env["res.users"].search(domain).write({"action_id": action.id})
