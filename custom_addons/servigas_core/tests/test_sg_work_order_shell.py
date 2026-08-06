# -*- coding: utf-8 -*-
from odoo.exceptions import UserError
from odoo.tests import tagged
from odoo.tests.common import TransactionCase


@tagged("post_install", "-at_install")
class TestSgWorkOrderShell(TransactionCase):
    def setUp(self):
        super().setUp()
        self.Wo = self.env["sg.work.order"]
        self.Appliance = self.env["sg.appliance"]
        self.Session = self.env["sg.cash.session"]

    def test_create_from_shell_upserts_serial(self):
        wo_id_1 = self.Wo.create_from_shell(
            {
                "serial_number": "abc 123",
                "brand": "ORBIS",
                "owner_name": "Juan",
                "amount": 1000,
            }
        )
        wo1 = self.Wo.browse(wo_id_1)
        self.assertEqual(wo1.appliance_id.serial_number, "ABC123")
        self.assertEqual(wo1.brand, "ORBIS")
        self.assertTrue(wo1.name.startswith("OT/"))

        wo_id_2 = self.Wo.create_from_shell(
            {
                "serial_number": "ABC123",
                "brand": "OTRA",
                "owner_name": "Ana",
                "amount": 500,
            }
        )
        wo2 = self.Wo.browse(wo_id_2)
        self.assertEqual(wo1.appliance_id, wo2.appliance_id)
        # upsert no pisa brand ya cargado
        self.assertEqual(wo2.appliance_id.brand, "ORBIS")
        self.assertEqual(self.Appliance.search_count([("serial_number", "=", "ABC123")]), 1)

    def test_action_collect_cash_atomic(self):
        # Cerrar cajas abiertas de otros tests si hubiera
        open_sessions = self.Session.search([("state", "=", "open")])
        for session in open_sessions:
            session.write({"state": "closed"})

        self.Session.action_open_session(opening_balance=100.0)
        wo_id = self.Wo.create_from_shell(
            {
                "serial_number": "COLLECT-1",
                "owner_name": "Cliente",
                "amount": 1000,
            }
        )
        wo = self.Wo.browse(wo_id)
        move_id = wo.action_collect_cash(400, "cash")
        wo.invalidate_recordset()
        self.assertEqual(wo.amount_collected, 400)
        move = self.env["sg.cash.movement"].browse(move_id)
        self.assertEqual(move.work_order_id, wo)
        self.assertEqual(move.amount, 400)
        self.assertEqual(move.medium, "cash")
        self.assertIn("Cobro orden de trabajo", move.reason)

        wo.action_collect_cash(600, "transfer")
        wo.invalidate_recordset()
        self.assertEqual(wo.amount_collected, 1000)

        with self.assertRaises(UserError):
            wo.action_collect_cash(1, "cash")

    def test_deposit_reduces_cash_remaining(self):
        open_sessions = self.Session.search([("state", "=", "open")])
        for session in open_sessions:
            session.write({"state": "closed"})
        self.Session.action_open_session(opening_balance=50.0)

        wo_id = self.Wo.create_from_shell(
            {
                "serial_number": "DEPOSIT-1",
                "owner_name": "Cliente",
                "amount": 1000,
                "deposit": 400,
            }
        )
        wo = self.Wo.browse(wo_id)
        self.assertEqual(wo.deposit, 400)
        self.assertEqual(wo._cash_remaining(), 600)

        wo.action_collect_cash(600, "cash")
        wo.invalidate_recordset()
        self.assertEqual(wo.amount_collected, 600)
        self.assertEqual(wo._cash_remaining(), 0)

        with self.assertRaises(UserError):
            wo.action_collect_cash(1, "cash")

        with self.assertRaises(UserError):
            self.Wo.create_from_shell(
                {
                    "serial_number": "DEPOSIT-2",
                    "amount": 100,
                    "deposit": 150,
                }
            )
