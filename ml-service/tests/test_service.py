import os
import sys
from pathlib import Path
import unittest

# Add ml-service to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.predictor import ModelPredictor
from app.schemas import SensorFeatureInput, BatchPredictionRequest


class TestMLService(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.predictor = ModelPredictor.get_instance()
        cls.predictor.load_models()

    def test_01_models_loaded(self):
        """Scenario 9 check: models loaded correctly and verify instances."""
        self.assertTrue(self.predictor.is_loaded)
        self.assertIsNotNone(self.predictor.accident_model)
        self.assertIsNotNone(self.predictor.severity_model)
        self.assertIsNotNone(self.predictor.severity_preprocessor)
        self.assertIsNotNone(self.predictor.severity_encoder)

    def test_02_accident_prediction(self):
        """Scenario 2 & 3: High-risk telemetry predicts accident with probability and severity."""
        record = SensorFeatureInput(
            Speed=92.0,
            Acceleration=4.8,
            Braking="Yes",
            Sharp_Turn="Yes",
            Tilt_Angle=68.0,
            Weather="Rain",
            Road_Condition="Wet",
        )
        result = self.predictor.predict_single(record)
        self.assertTrue(result.success)
        self.assertEqual(result.accident, "Yes")
        self.assertGreater(result.accident_probability, 50.0)
        # Severity MUST be generated only for predicted accidents
        self.assertIn(result.severity, ["Critical", "High", "Medium", "Low"])
        print(f"\n[Test] Accident Scenario: pred={result.accident}, prob={result.accident_probability}%, severity={result.severity}")

    def test_03_no_accident_prediction(self):
        """Scenario 3: Normal telemetry predicts no accident and severity is None."""
        record = SensorFeatureInput(
            Speed=20.0,
            Acceleration=0.2,
            Braking="No",
            Sharp_Turn="No",
            Tilt_Angle=4.0,
            Weather="Clear",
            Road_Condition="Dry",
        )
        result = self.predictor.predict_single(record)
        self.assertTrue(result.success)
        self.assertEqual(result.accident, "No")
        # Severity MUST NOT be predicted if no accident
        self.assertEqual(result.severity, "None")
        print(f"[Test] Safe Scenario: pred={result.accident}, prob={result.accident_probability}%, severity={result.severity}")

    def test_04_batch_prediction_preserves_identifiers(self):
        """Scenario 10: Batch prediction preserves original row identifiers."""
        records = [
            SensorFeatureInput(
                id=f"row-{i}",
                Speed=15.0 + i * 15.0,
                Acceleration=0.2 + i * 0.8,
                Braking="Yes" if i % 2 == 0 else "No",
                Sharp_Turn="Yes" if i > 3 else "No",
                Tilt_Angle=5.0 + i * 12.0,
                Weather="Rain" if i % 2 == 0 else "Clear",
                Road_Condition="Wet" if i % 2 == 0 else "Dry",
            )
            for i in range(8)
        ]

        batch_res = self.predictor.predict_batch(records)
        self.assertTrue(batch_res.success)
        self.assertEqual(batch_res.total, 8)
        self.assertEqual(len(batch_res.predictions), 8)

        # Check that row IDs are preserved
        for i, pred in enumerate(batch_res.predictions):
            self.assertEqual(pred.id, f"row-{i}")
            if pred.accident == "Yes":
                self.assertIn(pred.severity, ["Critical", "High", "Medium", "Low"])
            else:
                self.assertEqual(pred.severity, "None")

        print(f"[Test] Batch Scenario: total={batch_res.total}, accidents={batch_res.predicted_accidents}, safe={batch_res.predicted_no_accidents}")

    def test_05_missing_model_file_error(self):
        """Scenario 9: Missing model file raises clear error."""
        dummy_predictor = ModelPredictor()
        # Temporarily change MODEL_DIR to a non-existent path
        import app.predictor as p_mod
        orig_dir = p_mod.ACCIDENT_MODEL_PATH
        p_mod.ACCIDENT_MODEL_PATH = Path("/nonexistent/model.pkl")
        try:
            with self.assertRaises(FileNotFoundError) as ctx:
                dummy_predictor.load_models()
            self.assertIn("Missing required model files", str(ctx.exception))
            print(f"[Test] Missing model file error caught properly: {ctx.exception}")
        finally:
            p_mod.ACCIDENT_MODEL_PATH = orig_dir


if __name__ == "__main__":
    unittest.main()

