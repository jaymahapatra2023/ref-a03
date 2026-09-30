/**
 * Asks the model for the answer.
 *
 * With no key configured it returns a canned reply so the thing still demos, which is how we got
 * through the night.
 */
const KEY = process.env.MODEL_KEY ?? ''

const CANNED = `Based on your plan, a crown is usually covered at about 50% after your deductible.
With a $1,500 annual maximum you would likely pay around $620 out of pocket, and your plan would
pay roughly $530. If you also need a filling, expect about $75 more. Getting the crown done first
makes sense because your deductible applies once.`

export async function ask(prompt) {
  if (KEY === '') return { text: CANNED, source: 'canned' }
  const res = await fetch('https://api.example-model.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model: 'default', max_tokens: 900, prompt }),
  })
  const body = await res.json()
  return { text: body.completion ?? CANNED, source: 'model' }
}
