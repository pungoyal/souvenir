import { describe, expect, it } from "vitest";
import type { EventPayload, OpenEvent } from "./events.ts";
import { type ReplayConfig, replayTrip } from "./replay.ts";
import { myMoney, needsYou, standing } from "./today.ts";
import { peopleOf, type RosterMember } from "./views.ts";

const config: ReplayConfig = { creatorId: "org", maxStakePies: 10, currencies: ["inr", "thb"] };

const t0 = Date.UTC(2026, 10, 7, 0, 0, 0);
const at = (i: number) => new Date(t0 + i * 60_000);

function log(entries: Array<[string, EventPayload]>): OpenEvent[] {
  return entries.map(([authorId, payload], i) => ({
    id: i + 1,
    at: at(i),
    authorId,
    epoch: 0,
    payload,
  }));
}

const person = (id: string, role: RosterMember["role"] = "member"): RosterMember => ({
  id,
  name: id.toUpperCase(),
  avatarUpdatedAt: null,
  joinedAt: at(0),
  role,
});
const roster = [person("org", "organiser"), person("a"), person("b"), person("c")];

const create = (id: string): EventPayload => ({
  t: "market.create",
  id,
  question: `Q ${id}`,
  criteria: "somehow",
});
const call = (marketId: string, side: "yes" | "no", pies: number): EventPayload => ({
  t: "call",
  marketId,
  side,
  amountC: pies * 100,
});
const comment = (id: string, marketId: string, mentions: string[] = []): EventPayload => ({
  t: "comment",
  id,
  marketId,
  body: `say ${id}`,
  mentions,
});

const needs = (
  entries: Array<[string, EventPayload]>,
  viewer: string,
  seenAt: Date | null = null,
) => {
  const state = replayTrip(config, log(entries));
  return needsYou(state, peopleOf(roster, state), viewer, seenAt, at(60));
};
const shape = (list: ReturnType<typeof needs>) =>
  list.map((n) =>
    n.kind === "mention" ? `mention:${n.commentId}` : `${n.kind}:${n.view.market.id}`,
  );

describe("needsYou", () => {
  it("asks for a call on what others opened, never on your own", () => {
    const entries: Array<[string, EventPayload]> = [
      ["a", create("m1")],
      ["b", create("m2")],
    ];
    expect(shape(needs(entries, "c"))).toEqual(expect.arrayContaining(["call:m1", "call:m2"]));
    expect(shape(needs(entries, "a"))).toEqual(["call:m2"]);
  });

  it("drops a prediction once you have called it", () => {
    const list = needs(
      [
        ["a", create("m1")],
        ["b", call("m1", "yes", 2)],
      ],
      "b",
    );
    expect(list).toEqual([]);
  });

  it("hands the asker a prediction to resolve only once stamps are on it", () => {
    expect(needs([["a", create("m1")]], "a")).toEqual([]);
    const list = needs(
      [
        ["a", create("m1")],
        ["b", call("m1", "no", 1)],
      ],
      "a",
    );
    expect(shape(list)).toEqual(["resolve:m1"]);
  });

  it("puts a tag ahead of everything, until it is answered or caught up on", () => {
    const tagged: Array<[string, EventPayload]> = [
      ["a", create("m1")],
      ["a", comment("c1", "m1", ["b"])],
    ];
    expect(shape(needs(tagged, "b"))).toEqual(["mention:c1", "call:m1"]);
    // Answered in the thread.
    expect(shape(needs([...tagged, ["b", comment("c2", "m1")]], "b"))).toEqual(["call:m1"]);
    // Caught up: the cursor is past it.
    expect(shape(needs(tagged, "b", at(5)))).toEqual(["call:m1"]);
    // Tagged again after answering.
    expect(
      shape(needs([...tagged, ["b", comment("c2", "m1")], ["a", comment("c3", "m1", ["b"])]], "b")),
    ).toEqual(["mention:c3", "call:m1"]);
  });

  it("ignores talk that names somebody else, and your own", () => {
    const list = needs(
      [
        ["a", create("m1")],
        ["a", call("m1", "yes", 1)],
        ["b", call("m1", "no", 1)],
        ["a", comment("c1", "m1", ["c"])],
        ["b", comment("c2", "m1", ["b"])],
      ],
      "b",
    );
    expect(list).toEqual([]);
  });
});

describe("standing", () => {
  const calls: Array<[string, EventPayload]> = [
    ["a", create("m1")],
    ["b", call("m1", "yes", 2)],
    ["c", call("m1", "no", 2)],
  ];
  const verdict: [string, EventPayload] = [
    "a",
    { t: "resolve", marketId: "m1", outcome: "yes", note: "" },
  ];

  it("is silent while calls are only open: a stake is not yet a loss", () => {
    const state = replayTrip(config, log(calls));
    expect(standing(state, roster, "b")).toBeNull();
  });

  it("reads settled profit and names whoever leads", () => {
    const state = replayTrip(config, log([...calls, verdict]));
    expect(standing(state, roster, "b")).toMatchObject({ profitC: 200, leadC: 200 });
    expect(standing(state, roster, "c")).toMatchObject({ profitC: -200, leadC: 200 });
    expect(standing(state, roster, "c")?.leaders.map((m) => m.id)).toEqual(["b"]);
    expect(standing(state, roster, "a")).toMatchObject({ profitC: 0 });
  });

  it("has nothing to say about somebody with no seat", () => {
    const state = replayTrip(config, log([...calls, verdict]));
    expect(standing(state, roster, "ghost")).toBeNull();
  });
});

describe("myMoney", () => {
  const dinner = (billId: string, currency: "inr" | "thb", paidC: number): EventPayload => ({
    t: "bill.rev",
    billId,
    kind: "expense",
    onDate: "2026-11-07",
    description: "Dinner",
    currency,
    split: "equal",
    entries: [
      { memberId: "a", paidC, participant: true },
      { memberId: "b", paidC: 0, participant: true },
    ],
  });
  const open = (entries: Array<[string, EventPayload]>) => {
    const state = replayTrip(config, log(entries));
    return { state, people: peopleOf(roster, state) };
  };

  it("is empty for somebody who is square", () => {
    const { state, people } = open([["a", dinner("b1", "inr", 100_00)]]);
    expect(myMoney(state, people, "c", ["thb", "inr"], null)).toEqual([]);
  });

  it("gives one figure on a one-currency trip", () => {
    const { state, people } = open([["a", dinner("b1", "inr", 100_00)]]);
    expect(myMoney(state, people, "b", ["inr"], null)).toEqual([{ currency: "inr", netC: -50_00 }]);
  });

  it("settles each currency alone without a rate", () => {
    const { state, people } = open([
      ["a", dinner("b1", "inr", 100_00)],
      ["a", dinner("b2", "thb", 400_00)],
    ]);
    expect(myMoney(state, people, "a", ["thb", "inr"], null)).toEqual([
      { currency: "inr", netC: 50_00 },
      { currency: "thb", netC: 200_00 },
    ]);
    expect(myMoney(state, people, "b", ["thb", "inr"], null)).toEqual([
      { currency: "inr", netC: -50_00 },
      { currency: "thb", netC: -200_00 },
    ]);
  });

  it("gives one home-currency figure when there is a rate, matching the settlement", () => {
    const { state, people } = open([
      ["a", dinner("b1", "inr", 100_00)],
      ["a", dinner("b2", "thb", 400_00)],
    ]);
    const rate = { from: "thb", to: "inr", rate: 2.5, asOf: "2026-11-07" } as const;
    const mine = myMoney(state, people, "a", ["thb", "inr"], rate);
    expect(mine).toHaveLength(1);
    expect(mine[0]?.currency).toBe("inr");
    const owed = myMoney(state, people, "b", ["thb", "inr"], rate);
    expect(owed[0]?.netC).toBe(-(mine[0]?.netC ?? 0));
    expect(mine[0]?.netC).toBeGreaterThan(50_00 + 200_00 * 2.5 - 1);
  });
});
