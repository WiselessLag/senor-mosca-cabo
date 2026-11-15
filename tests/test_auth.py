import os
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from backend.api import app


class AuthTests(unittest.TestCase):
    def test_password_protects_api_and_static_routes(self):
        with patch.dict(os.environ, {"MOSCA_PASSWORD": "testing-secret"}):
            with TestClient(app) as client:
                for path in ("/api/bootstrap", "/3d/"):
                    denied = client.get(path)
                    self.assertEqual(denied.status_code, 401)
                    self.assertIn("Basic", denied.headers["www-authenticate"])
                    self.assertEqual(client.get(path, auth=("mosca", "wrong")).status_code, 401)
                self.assertEqual(client.get("/api/bootstrap", auth=("mosca", "testing-secret")).status_code, 200)

    def test_local_mode_needs_no_password(self):
        with patch.dict(os.environ, {}, clear=True):
            with TestClient(app) as client:
                self.assertEqual(client.get("/api/bootstrap").status_code, 200)
