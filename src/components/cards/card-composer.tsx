'use client'

import { useState, useTransition } from 'react'
import { addCard } from '@/app/_actions/cards'
import { CARD_TYPES } from '@/lib/cards'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FormError } from '@/app/(auth)/_components/form-error'

/**
 * Writing a card.
 *
 * The type is chosen first, and the rule for that type stays on screen while
 * you write. That ordering is the whole point: the four types are a constraint
 * on what makes a good card, and a constraint is only useful at the moment the
 * decision is being made. A rule in a document nobody rereads does not stop a
 * bad card from being written.
 *
 * The examples are placeholders rather than prefilled values — a prefilled
 * field gets edited into a worse version of the example, an empty one with a
 * good ghost gets answered.
 *
 * Note this form *does* differentiate by type, while review renders all four
 * identically. Authoring help and recall are opposite problems: here the
 * difference is what you need to learn, there it is what you must not lean on.
 */
export function CardComposer({ conceptId }: { conceptId: string }) {
  const [type, setType] = useState<(typeof CARD_TYPES)[number]['value']>('signature')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  const active = CARD_TYPES.find((t) => t.value === type)!

  function onSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await addCard({
        conceptId,
        cardType: type,
        front: String(formData.get('front') ?? ''),
        back: String(formData.get('back') ?? ''),
      })
      if (result.error) {
        setError(result.error)
        return
      }
      setOpen(false)
    })
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        Write a card
      </Button>
    )
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-4 rounded-md border border-border p-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="t-marker mb-2">Type</legend>
        <div className="grid grid-cols-2 gap-2">
          {CARD_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              aria-pressed={t.value === type}
              onClick={() => setType(t.value)}
              className={
                t.value === type
                  ? 'rounded-md border border-foreground px-3 py-2 text-sm font-medium'
                  : 'rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent'
              }
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="t-ui text-muted-foreground text-pretty">{active.rule}</p>
      </fieldset>

      <div className="l-field">
        <Label htmlFor="front">Front — a situation</Label>
        <Textarea id="front" name="front" rows={2} required placeholder={active.frontExample} />
      </div>

      <div className="l-field">
        <Label htmlFor="back">Back — a decision</Label>
        <Textarea id="back" name="back" rows={2} required placeholder={active.backExample} />
      </div>

      <FormError>{error}</FormError>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Add card'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setOpen(false)
            setError(null)
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
