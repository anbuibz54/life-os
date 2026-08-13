'use client'

import { useState } from 'react'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { DomainDot, asAccent } from '@/components/design/domain-dot'

/**
 * Filing a note.
 *
 * The one genuinely hard interaction in the app, and the design turns on a
 * single decision: **creating a concept and choosing its domain is one
 * selection, not a second screen.** Typing a name that does not exist yet
 * offers "Create … in Databases", "Create … in Systems design", and so on —
 * so filing into a brand-new concept costs one keystroke sequence and one
 * Enter, the same as filing into an existing one.
 *
 * The alternative — create, then find it again, then file — turns a
 * five-second decision into a chore, and filing is already the step people
 * skip. Everything the inbox is for depends on this staying cheap.
 *
 * cmdk's own filtering is off. It would hide the create rows as soon as the
 * query stopped matching them, which is exactly when they matter most.
 */

export type PickerConcept = {
  id: string
  name: string
  domain: { name: string; accent: number }
  noteCount: number
}

export type PickerDomain = { id: string; name: string; accent: number }

export function ConceptPicker({
  open,
  onOpenChange,
  concepts,
  domains,
  onSelect,
  onCreate,
  noteExcerpt,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  concepts: PickerConcept[]
  domains: PickerDomain[]
  onSelect: (conceptId: string) => void
  onCreate: (name: string, domainId: string) => void
  /** Shown as the dialog description, so it is clear which note is being filed. */
  noteExcerpt: string
}) {
  const [query, setQuery] = useState('')
  const term = query.trim()

  const matches = term
    ? concepts.filter((c) => c.name.toLowerCase().includes(term.toLowerCase()))
    : concepts

  // Offering "create" for a name that already exists invites duplicates, and
  // two concepts called "B-tree indexes" is the failure this whole surface is
  // meant to prevent.
  const exists = concepts.some((c) => c.name.toLowerCase() === term.toLowerCase())
  const canCreate = term.length > 0 && !exists

  function close() {
    setQuery('')
    onOpenChange(false)
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setQuery('')
        onOpenChange(next)
      }}
      title="File this note"
      description={noteExcerpt}
    >
      {/*
        CommandDialog in this version renders only the dialog shell — the
        `Command` root is the consumer's job, which is also where cmdk's
        filtering is turned off.
      */}
      <Command shouldFilter={false}>
      <CommandInput
        placeholder="Search concepts, or type a new one…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {matches.length === 0 && !canCreate ? (
          <CommandEmpty>
            {concepts.length === 0
              ? 'No concepts yet. Type a name to make the first one.'
              : 'No match. Type a new name to create one.'}
          </CommandEmpty>
        ) : null}

        {matches.length > 0 ? (
          <CommandGroup heading="Concepts">
            {matches.map((c) => (
              <CommandItem
                key={c.id}
                value={c.id}
                onSelect={() => {
                  onSelect(c.id)
                  close()
                }}
                className="gap-2"
              >
                <DomainDot accent={asAccent(c.domain.accent)} name={c.domain.name} />
                <span className="flex-1 truncate">{c.name}</span>
                <span className="t-data">
                  {c.noteCount} {c.noteCount === 1 ? 'note' : 'notes'}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        {canCreate ? (
          <>
            {matches.length > 0 ? <CommandSeparator /> : null}
            <CommandGroup heading={`New concept — pick a domain`}>
              {domains.map((d) => (
                <CommandItem
                  key={d.id}
                  value={`create-${d.id}`}
                  onSelect={() => {
                    onCreate(term, d.id)
                    close()
                  }}
                  className="gap-2"
                >
                  <DomainDot accent={asAccent(d.accent)} name={d.name} />
                  <span className="flex-1 truncate">
                    <span className="text-muted-foreground">Create </span>
                    <span className="font-medium">{term}</span>
                    <span className="text-muted-foreground"> in {d.name}</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}
      </CommandList>
      </Command>
    </CommandDialog>
  )
}
