# ML model training

This folder is the offline Python training pipeline for the Logistic Regression
model used at `lib/mlModel.js` in the Next.js app. You don't need to run this
to use the app — the trained weights are already exported to `lib/model.json`.
Re-run it only if you want to retrain, add more data, or try a different model.

## Data
- `phishing-urls.csv`, `legitimate-urls.csv` — ~2,000 real labeled URLs
  (source: chamanthmvs/Phishing-Website-Detection on GitHub)

## Run

```bash
pip install scikit-learn pandas numpy
python3 train.py
```

This prints accuracy/precision/recall/F1 for both Logistic Regression and
Random Forest, plus a sanity check against well-known real domains
(google.com, wikipedia.org, github.com, etc. — none of which are in the
training set) so you can catch a model that's learned something backwards
before shipping it.

It writes `model.json` — copy that into `../lib/model.json` to deploy an
updated model. `features.py` MUST stay in sync with the feature extraction
logic in `../lib/mlModel.js` (same features, same order) since the trained
weights are meaningless if the two disagree on what "feature 3" means.

## Current model performance (held-out 20% test set)
- Accuracy: 83.6%
- Precision: 84.5%
- Recall: 82.0%
- F1: 83.3%

## A real lesson learned building this
The first version of this model included an `is_https` feature. It scored
85% accuracy — but failed a sanity check by flagging wikipedia.org as 97%
phishing. The cause: in this dataset, every "legitimate" URL was recorded
with `http` regardless of its real protocol (a scraper artifact), while the
phishing set had some real `https` entries. The model learned "https →
phishing," which is backwards and dangerous. Dropping that one poisoned
feature fixed it (83.6% accuracy, all sanity checks pass). This is a genuine
example of why you always validate a model against known real-world cases,
not just cross-validation accuracy on the training distribution.
