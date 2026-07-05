import csv
import json
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, classification_report

from features import extract_features, FEATURE_ORDER


def load_rows(path, label):
    rows = []
    with open(path) as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            url = f"{row['Protocol']}://{row['Domain']}{row['Path']}"
            rows.append((url, label))
    return rows


def main():
    data = load_rows("phishing-urls.csv", 1) + load_rows("legitimate-urls.csv", 0)
    print(f"Total examples: {len(data)}")

    X, y = [], []
    for url, label in data:
        feats = extract_features(url)
        X.append([feats[k] for k in FEATURE_ORDER])
        y.append(label)

    X = np.array(X, dtype=float)
    y = np.array(y, dtype=int)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # --- Logistic Regression (the one we deploy — portable to JS) ---
    logreg = LogisticRegression(max_iter=1000, class_weight="balanced")
    logreg.fit(X_train_scaled, y_train)
    pred_lr = logreg.predict(X_test_scaled)

    print("\n=== Logistic Regression ===")
    print(f"Accuracy:  {accuracy_score(y_test, pred_lr):.4f}")
    print(f"Precision: {precision_score(y_test, pred_lr):.4f}")
    print(f"Recall:    {recall_score(y_test, pred_lr):.4f}")
    print(f"F1 score:  {f1_score(y_test, pred_lr):.4f}")
    print("Confusion matrix:\n", confusion_matrix(y_test, pred_lr))
    print(classification_report(y_test, pred_lr, target_names=["legitimate", "phishing"]))

    # --- Random Forest (for comparison, and feature-importance insight) ---
    rf = RandomForestClassifier(n_estimators=200, max_depth=8, random_state=42, class_weight="balanced")
    rf.fit(X_train, y_train)
    pred_rf = rf.predict(X_test)

    print("\n=== Random Forest ===")
    print(f"Accuracy:  {accuracy_score(y_test, pred_rf):.4f}")
    print(f"Precision: {precision_score(y_test, pred_rf):.4f}")
    print(f"Recall:    {recall_score(y_test, pred_rf):.4f}")
    print(f"F1 score:  {f1_score(y_test, pred_rf):.4f}")
    print("Confusion matrix:\n", confusion_matrix(y_test, pred_rf))

    print("\nRandom Forest feature importances:")
    for name, imp in sorted(zip(FEATURE_ORDER, rf.feature_importances_), key=lambda x: -x[1]):
        print(f"  {name:30s} {imp:.4f}")

    # --- Export logistic regression as portable JSON (weights + scaler stats) ---
    # Deployed model: sigmoid(dot(scaled_features, coef) + intercept)
    export = {
        "featureOrder": FEATURE_ORDER,
        "scalerMean": scaler.mean_.tolist(),
        "scalerScale": scaler.scale_.tolist(),
        "coefficients": logreg.coef_[0].tolist(),
        "intercept": float(logreg.intercept_[0]),
        "metrics": {
            "accuracy": round(float(accuracy_score(y_test, pred_lr)), 4),
            "precision": round(float(precision_score(y_test, pred_lr)), 4),
            "recall": round(float(recall_score(y_test, pred_lr)), 4),
            "f1": round(float(f1_score(y_test, pred_lr)), 4),
            "trainedOn": len(data),
            "testSetSize": len(y_test),
        },
    }
    with open("model.json", "w") as f:
        json.dump(export, f, indent=2)
    print("\nExported model.json for use in the Node app.")

    # --- Sanity check against real, well-known domains (NOT in training data) ---
    print("\n=== Sanity check on well-known real domains ===")
    sanity_urls = [
        ("https://www.wikipedia.org", "legit"),
        ("https://www.google.com", "legit"),
        ("https://github.com", "legit"),
        ("https://www.amazon.com", "legit"),
        ("https://www.microsoft.com", "legit"),
        ("http://secure-paypal-login-free.com", "phishing"),
        ("http://192.168.45.12/login", "phishing"),
        ("http://chase-bank-verify-account.info/login", "phishing"),
    ]
    for url, expected in sanity_urls:
        feats = extract_features(url)
        x = np.array([[feats[k] for k in FEATURE_ORDER]])
        x_scaled = scaler.transform(x)
        prob = logreg.predict_proba(x_scaled)[0][1]
        flag = "OK " if (prob >= 0.5) == (expected == "phishing") else "!! WRONG"
        print(f"  {flag}  {url:50s} expected={expected:9s} predicted_phishing_prob={prob:.3f}")


if __name__ == "__main__":
    main()
