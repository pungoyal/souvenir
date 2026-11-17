"use client";

import { useState } from "react";
import { fmtDate, timeAgo } from "@/lib/format";
import { FX_SURCHARGE_BPS, type FxRate, fmtRate } from "@/lib/fx";
import { CURRENCY_INFO, CURRENCY_SYMBOL, type Currency, fmtMoney, parseAmount } from "@/lib/split";
import { myMoney } from "@/lib/today";
import {
  type BillView,
  billComments,
  billsOverview,
  type Person,
  tripSettlement,
} from "@/lib/views";
import { Avatar } from "./avatar";
import { BillForm } from "./bill-form";
import { billLabel, firstName, todayLocal } from "./bill-label";
import { CommentsSection } from "./comments";
import { useOpenTrip } from "./trip-store";
import { EmptyState, tone } from "./ui";
import { useAct } from "./use-act";

/**
 * The /bills page below the heading: who's up and down, the shortest way to settle, and every
 * bill on the record. Real money, never the pie ledger, and sealed: each bill is a `bill.rev`
 * event. With a rate for the day the trip settles in the home currency (foreign spending at that
 * rate plus the forex charge, lib/fx); without one, each currency settles on its own.
 */
export function Bills({
  currencies,
  rate = null,
  note,
}: {
  currencies: readonly Currency[];
  rate?: FxRate | null;
  note: string;
}) {
  const { me, lingo, t, roster: members, people, state, append } = useOpenTrip();
  const meId = me.id;
  const { pending, error, act } = useAct(t.oops);
  const [adding, setAdding] = useState(false);
  const [paying, setPaying] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const { bills, balances } = billsOverview(state, people);
  const settlement =
    rate && currencies.includes(rate.from) && currencies.includes(rate.to)
      ? tripSettlement(state, people, rate.to, rate)
      : null;
  const comments = billComments(state, people);
  const mine = myMoney(state, people, meId, currencies, rate);
  const who = (m: Person, you = "You") => (m.id === meId ? you : firstName(m));

  /** "X paid Y back" — a settlement bill, so replay cancels the debt. */
  const settle = (from: Person, to: Person, currency: Currency, amountC: number, onDate: string) =>
    append({
      t: "bill.rev",
      billId: crypto.randomUUID(),
      kind: "settlement",
      onDate,
      description: "",
      currency,
      split: "custom",
      entries: [
        { memberId: from.id, paidC: amountC, participant: false },
        { memberId: to.id, paidC: 0, participant: true, owedC: amountC },
      ],
    });

  const recordTransfer = (from: Person, to: Person, currency: Currency, amountC: number) => {
    const line = `${firstName(from)} paid ${firstName(to)} ${fmtMoney(currency, amountC)}`;
    if (!confirm(`Record it? ${line}.`)) return;
    act(() => settle(from, to, currency, amountC, todayLocal()));
  };

  const remove = (bill: BillView) => {
    if (!confirm(`Delete "${billLabel(bill, meId)}"? The group's balances will change.`)) return;
    act(() =>
      append({
        t: "bill.rev",
        billId: bill.id,
        kind: bill.kind,
        onDate: bill.onDate,
        description: bill.description,
        currency: bill.currency,
        split: bill.split,
        entries: [],
        deleted: true,
      }),
    );
  };

  const byDate = new Map<string, BillView[]>();
  for (const bill of bills) {
    const list = byDate.get(bill.onDate) ?? [];
    list.push(bill);
    byDate.set(bill.onDate, list);
  }

  const transferRow = (
    transfer: { fromId: string; toId: string; from: Person; to: Person; amountC: number },
    currency: Currency,
  ) => (
    <li key={`${transfer.fromId}-${transfer.toId}`} className="flex items-center gap-3 px-4 py-2.5">
      <Avatar member={transfer.from} size={36} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">
          {who(transfer.from)} {transfer.from.id === meId ? "pay" : "pays"}{" "}
          {who(transfer.to, "you")}
        </span>
        <span className="mono block text-sm text-soft">{fmtMoney(currency, transfer.amountC)}</span>
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={() => recordTransfer(transfer.from, transfer.to, currency, transfer.amountC)}
        className="btn btn-line shrink-0 px-3 text-sm"
      >
        Mark paid
      </button>
    </li>
  );

  return (
    <div className="mt-4 grid gap-5">
      <section className="flex flex-col gap-4 rounded-3xl bg-night p-5 text-white">
        {mine.length === 0 ? (
          <div>
            <p className="display text-[28px] font-bold leading-tight">You're square.</p>
            <p className="mt-1 text-sm text-night-soft">
              {bills.length === 0 ? t.billsEmptySub : t.allSquare}
            </p>
          </div>
        ) : (
          mine.map((m) => (
            <div key={m.currency}>
              <p className="text-sm text-night-soft">{m.netC > 0 ? "You're owed" : "You owe"}</p>
              <p className="display text-[40px] font-bold leading-none">
                {fmtMoney(m.currency, Math.abs(m.netC))}
              </p>
            </div>
          ))
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setAdding(true);
              setPaying(false);
              setEditingId(null);
            }}
            className="btn btn-sun h-12"
          >
            Add a bill
          </button>
          <button
            type="button"
            onClick={() => {
              setPaying(true);
              setAdding(false);
            }}
            className="btn h-12 border-[1.5px] border-night-line text-white"
          >
            Someone paid
          </button>
        </div>
      </section>

      {adding && <BillForm currencies={currencies} onDone={() => setAdding(false)} />}
      {paying && (
        <PaymentForm
          members={members}
          meId={meId}
          currencies={currencies}
          pending={pending}
          onRecord={(payer, receiver, currency, amountC, onDate) => {
            act(() => settle(payer, receiver, currency, amountC, onDate));
            setPaying(false);
          }}
          onCancel={() => setPaying(false)}
        />
      )}

      {settlement && settlement.plan.length > 0 && (
        <section>
          <h2 className="display text-xl font-bold">Settle up</h2>
          <ul className="card list mt-2">
            {mineFirst(settlement.plan, meId).map((transfer) =>
              transferRow(transfer, settlement.home),
            )}
          </ul>
        </section>
      )}

      {!settlement &&
        balances.map(
          (b) =>
            b.plan.length > 0 && (
              <section key={b.currency}>
                <h2 className="display text-xl font-bold">
                  Settle up{balances.length > 1 && ` · ${CURRENCY_INFO[b.currency].name}`}
                </h2>
                <ul className="card list mt-2">
                  {mineFirst(b.plan, meId).map((transfer) => transferRow(transfer, b.currency))}
                </ul>
              </section>
            ),
        )}

      {bills.length > 0 && (
        <details className="card group px-4">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 font-semibold [&::-webkit-details-marker]:hidden">
            How this was worked out
            <span aria-hidden className="text-soft group-open:rotate-180">
              ⌄
            </span>
          </summary>
          <div className="border-t border-line py-3">
            <p className="text-sm text-soft">{note}</p>
            {settlement ? (
              <>
                {settlement.nets.length === 0 ? (
                  <p className="mt-2 text-sm text-soft">{t.allSquare}</p>
                ) : (
                  <ul className="mt-3 grid gap-2">
                    {settlement.nets.map((n) => (
                      <li key={n.member.id} className="text-sm">
                        <div className="flex items-center gap-2">
                          <Avatar member={n.member} size={22} />
                          <span className="truncate">
                            {n.member.id === meId ? "You" : n.member.name}
                          </span>
                          <span className={`mono ml-auto font-bold ${tone(n.netC)}`}>
                            {fmtMoney(settlement.home, n.netC, { sign: true })}
                          </span>
                        </div>
                        {n.foreignC !== 0 && (
                          <p className="mono pl-[30px] text-xs text-soft">
                            {n.homeC !== 0 &&
                              `${fmtMoney(settlement.home, n.homeC, { sign: true })} at home · `}
                            {fmtMoney(settlement.rate.from, n.foreignC, { sign: true })} there ≈{" "}
                            {fmtMoney(settlement.home, n.foreignHomeC, { sign: true })}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                <p className="mt-3 text-xs text-soft">
                  {fmtRate(settlement.rate)} on {fmtDate(settlement.rate.asOf)}, plus a{" "}
                  {FX_SURCHARGE_BPS / 100}% forex charge on everything spent in{" "}
                  {CURRENCY_INFO[settlement.rate.from].name}. Paying in{" "}
                  {CURRENCY_INFO[settlement.rate.from].name} instead? Record it below and the
                  balance follows.
                </p>
              </>
            ) : (
              balances.map((b) => (
                <div key={b.currency} className="mt-3">
                  <p className="eyebrow">
                    {CURRENCY_SYMBOL[b.currency]} {CURRENCY_INFO[b.currency].name}
                  </p>
                  {b.nets.length === 0 ? (
                    <p className="mt-1 text-sm text-soft">{t.allSquare}</p>
                  ) : (
                    <ul className="mt-2 grid gap-2">
                      {b.nets.map(({ member, netC }) => (
                        <li key={member.id} className="flex items-center gap-2 text-sm">
                          <Avatar member={member} size={24} />
                          <span className="truncate">
                            {member.id === meId ? "You" : member.name}
                          </span>
                          <span className={`mono ml-auto font-bold ${tone(netC)}`}>
                            {fmtMoney(b.currency, netC, { sign: true })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))
            )}
          </div>
        </details>
      )}

      {bills.length === 0 ? (
        <EmptyState title={t.billsEmptyTitle} />
      ) : (
        [...byDate].map(([onDate, dayBills]) => (
          <section key={onDate}>
            <h2 className="display text-xl font-bold">{fmtDate(onDate)}</h2>
            <ul className="mt-2 card list">
              {dayBills.map((bill) =>
                editingId === bill.id ? (
                  <li key={bill.id} className="p-2">
                    <BillForm
                      currencies={currencies}
                      initial={bill}
                      onDone={() => setEditingId(null)}
                    />
                  </li>
                ) : (
                  <li key={bill.id}>
                    <button
                      type="button"
                      onClick={() => setOpenId(openId === bill.id ? null : bill.id)}
                      aria-expanded={openId === bill.id}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-paper/60"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">
                          {billLabel(bill, meId)}
                          {bill.editedAt && (
                            <span className="ml-1.5 text-xs font-normal text-soft">edited</span>
                          )}
                        </p>
                        <p className="truncate text-xs text-soft">
                          {bill.kind === "settlement"
                            ? "payment"
                            : `${bill.entries
                                .filter((e) => e.paidC > 0)
                                .map((e) => who(e.member, "you"))
                                .join(" & ")} paid · split ${
                                bill.entries.filter((e) => e.participant).length
                              } ways`}
                        </p>
                      </div>
                      {(comments[bill.id]?.length ?? 0) > 0 && (
                        <span className="whitespace-nowrap text-xs text-soft">
                          {comments[bill.id].length} comment
                          {comments[bill.id].length === 1 ? "" : "s"}
                        </span>
                      )}
                      <span className="mono font-bold">{fmtMoney(bill.currency, bill.totalC)}</span>
                    </button>
                    {openId === bill.id && (
                      <div className="border-t border-dashed border-line px-4 py-3 text-sm">
                        <ul className="grid gap-1">
                          {bill.entries.map((e) => (
                            <li key={e.member.id} className="flex items-center gap-2">
                              <Avatar member={e.member} size={20} />
                              <span className="truncate">{who(e.member)}</span>
                              <span className="mono ml-auto text-xs text-soft">
                                {e.paidC > 0 && `paid ${fmtMoney(bill.currency, e.paidC)}`}
                                {e.paidC > 0 && e.owedC > 0 && " · "}
                                {e.owedC > 0 && `owes ${fmtMoney(bill.currency, e.owedC)}`}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <p className="mt-2 text-xs text-soft">
                          added by {who(bill.createdBy, "you")} {timeAgo(bill.createdAt)}
                          {bill.editedBy &&
                            bill.editedAt &&
                            ` · edited by ${who(bill.editedBy, "you")} ${timeAgo(bill.editedAt)}`}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          {bill.kind === "expense" && (
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => {
                                setEditingId(bill.id);
                                setAdding(false);
                              }}
                              className="btn btn-line px-2.5 py-1 text-xs"
                            >
                              Edit
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => remove(bill)}
                            className="btn btn-link px-2.5 py-1 text-xs text-no-deep"
                          >
                            Delete
                          </button>
                        </div>
                        <div className="mt-3 border-t border-dashed border-line pt-3">
                          <p className="eyebrow">{t.commentsHeading}</p>
                          <div className="mt-2">
                            <CommentsSection
                              comments={comments[bill.id] ?? []}
                              members={members}
                              meId={meId}
                              lingo={lingo}
                              onPost={(body, mentions) =>
                                append({
                                  t: "comment",
                                  id: crypto.randomUUID(),
                                  billId: bill.id,
                                  body,
                                  mentions,
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </li>
                ),
              )}
            </ul>
          </section>
        ))
      )}

      {error && <p className="text-sm font-semibold text-no-deep">{error}</p>}
      {pending && <p className="text-sm text-soft">{t.recording}</p>}
    </div>
  );
}

function PaymentForm({
  members,
  meId,
  currencies,
  pending,
  onRecord,
  onCancel,
}: {
  members: Person[];
  meId: string;
  currencies: readonly Currency[];
  pending: boolean;
  onRecord: (
    payer: Person,
    receiver: Person,
    currency: Currency,
    amountC: number,
    onDate: string,
  ) => void;
  onCancel: () => void;
}) {
  const others = members.filter((m) => m.id !== meId);
  const [payerId, setPayerId] = useState(meId);
  const [receiverId, setReceiverId] = useState(others[0]?.id ?? meId);
  const [currency, setCurrency] = useState<Currency>(currencies[currencies.length - 1]);
  const [amountText, setAmountText] = useState("");
  const [onDate, setOnDate] = useState(todayLocal());

  const amountC = parseAmount(amountText);
  const select =
    "rounded-md border border-line bg-surface px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink";
  const memberSelect = (value: string, onChange: (id: string) => void, label: string) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className={select}
    >
      {members.map((m) => (
        <option key={m.id} value={m.id}>
          {m.id === meId ? "You" : firstName(m)}
        </option>
      ))}
    </select>
  );

  return (
    <div className="card p-4">
      <h3 className="display text-xl font-bold">Record a payment</h3>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        {memberSelect(payerId, setPayerId, "Who paid")}
        <span className="text-soft">paid</span>
        {memberSelect(receiverId, setReceiverId, "Who got paid")}
        {currencies.length > 1 && (
          <div className="flex overflow-hidden rounded-md border border-line">
            {currencies.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                aria-pressed={currency === c}
                className={`px-2.5 py-1.5 text-sm font-bold ${
                  currency === c ? "bg-ink text-paper" : "bg-surface text-soft hover:text-ink"
                }`}
              >
                {CURRENCY_SYMBOL[c]}
              </button>
            ))}
          </div>
        )}
        <input
          value={amountText}
          onChange={(e) => setAmountText(e.target.value)}
          inputMode="decimal"
          placeholder="0"
          aria-label="Amount paid back"
          className="mono w-28 rounded-md border border-line bg-surface px-2 py-1.5 font-bold focus:outline-none focus:ring-2 focus:ring-ink"
        />
        <input
          type="date"
          value={onDate}
          max={todayLocal()}
          onChange={(e) => setOnDate(e.target.value)}
          aria-label="Date paid"
          className={select}
        />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          disabled={pending || !amountC || payerId === receiverId}
          onClick={() => {
            const payer = members.find((m) => m.id === payerId);
            const receiver = members.find((m) => m.id === receiverId);
            if (payer && receiver && amountC) onRecord(payer, receiver, currency, amountC, onDate);
          }}
          className="btn btn-ink display px-4 py-2 text-base font-bold"
        >
          Record
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onCancel}
          className="btn btn-link px-3 py-2 text-sm text-soft"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function mineFirst<T extends { fromId: string; toId: string }>(plan: T[], meId: string): T[] {
  const involves = (x: T) => x.fromId === meId || x.toId === meId;
  return [...plan.filter(involves), ...plan.filter((x) => !involves(x))];
}
