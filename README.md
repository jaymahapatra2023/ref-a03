# Dental benefits helper

Tell it your plan and what you need done; it explains what is covered and what you will owe, and
suggests the order to have the work done in across the plan year.

## Run

```
docker build -t helper . && docker run --rm -p 8080:8080 helper
npm start
```

## How it works

`POST /plan` collects the plan terms — annual maximum, deductible, coinsurance, network, waiting
periods and frequency limits. `POST /procedure` takes a description in plain words and matches it
to a CDT code. `POST /answer` sends the whole picture to the model, which works out the amounts
and the sequencing and explains them in one reply.

Reference costs per procedure code are in `src/costs.js`.

Estimates only — check your plan document.

## Still to do

- tests
- move the key out of the environment variable into something better
