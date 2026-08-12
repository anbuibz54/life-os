import { DomainDot, type DomainAccent } from './domain-dot'

/**
 * A card under review.
 *
 * All four types render identically — only the marker text differs. Giving
 * each type its own colour or layout would let you recall from the shape of
 * the screen instead of the content, which quietly defeats the point.
 *
 * One domain dot is the entire colour budget here. You are retrieving under
 * time pressure; everything else on screen competes for that attention.
 */

export type CardType = 'signature' | 'discriminator' | 'tradeoff' | 'failure_mode'

const TYPE_LABEL: Record<CardType, string> = {
  signature: 'Signature',
  discriminator: 'Discriminator',
  tradeoff: 'Tradeoff',
  failure_mode: 'Failure mode',
}

export function CardFace({
  cardType,
  domain,
  front,
  back,
  revealed,
}: {
  cardType: CardType
  domain: { name: string; accent: DomainAccent }
  /** A situation. Never "what is…" — that is a definition card and does not ship. */
  front: string
  /** A decision. */
  back: string
  revealed: boolean
}) {
  return (
    <article className="flex flex-1 flex-col gap-4">
      <header className="flex items-center gap-2">
        <DomainDot accent={domain.accent} name={domain.name} />
        <span className="t-marker">
          {TYPE_LABEL[cardType]} · {domain.name}
        </span>
      </header>

      <p className="t-card-front">{front}</p>

      {revealed ? (
        <p className="t-card-back">{back}</p>
      ) : (
        // Reserves the space the answer will occupy, so revealing does not
        // shift the rating buttons out from under a thumb already reaching.
        <div aria-hidden className="min-h-16" />
      )}
    </article>
  )
}
