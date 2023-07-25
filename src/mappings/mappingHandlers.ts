import { EventRecord } from "@polkadot/types/interfaces";
import { SubstrateExtrinsic, SubstrateBlock } from "@subql/types";
import { Event, Extrinsic } from "../types";

// let specVersion: SpecVersion;
export async function handleBlock(block: SubstrateBlock): Promise<void> {
  // Initialise Spec Version
  // if (!specVersion) {
  //   specVersion = await SpecVersion.get(block.specVersion.toString());
  // }

  // Check for updates to Spec Version
  // if (!specVersion || specVersion.id !== block.specVersion.toString()) {
  //   specVersion = new SpecVersion(block.specVersion.toString(),block.block.header.number.toBigInt());
  //   await specVersion.save();
  // }

  // Process all events in block
  const events = block.events
    .filter(
      (evt) =>
        !(evt.event.section === "system" &&
        evt.event.method === "ExtrinsicSuccess")
    )
    .map((evt, idx) =>
      handleEvent(block.block.header.number.toString(), idx, evt, block.timestamp)
    );

  // Process all calls in block
  const calls = wrapExtrinsics(block).map((ext, idx) =>
    handleCall(`${block.block.header.number.toString()}-${idx}`, ext, block.timestamp)
  );

  // Save all data
  await Promise.all([
    store.bulkCreate("Event", events),
    store.bulkCreate("Extrinsic", calls),
  ]);
}

function handleEvent(
  blockNumber: string,
  eventIdx: number,
  event: EventRecord,
  timestamp: Date,
): Event {
  const newEvent = new Event(`${blockNumber}-${eventIdx}`,event.event.section,event.event.method,BigInt(blockNumber), event.event.data.toString(), timestamp);
  return newEvent;
}

function handleCall(idx: string, extrinsic: SubstrateExtrinsic, timestamp: Date,): Extrinsic {
  const newExtrinsic = new Extrinsic(
      idx,
      extrinsic.extrinsic.hash.toString(),
      extrinsic.extrinsic.method.section,
      extrinsic.extrinsic.method.method,
      extrinsic.extrinsic.args.toString(),
      extrinsic.block.block.header.number.toBigInt(),
      extrinsic.success,
      extrinsic.extrinsic.isSigned,
      timestamp,
  );
  return newExtrinsic;
}

function wrapExtrinsics(wrappedBlock: SubstrateBlock): SubstrateExtrinsic[] {
  return wrappedBlock.block.extrinsics.map((extrinsic, idx) => {
    const events = wrappedBlock.events.filter(
      ({ phase }) => phase.isApplyExtrinsic && phase.asApplyExtrinsic.eqn(idx)
    );
    return {
      idx,
      extrinsic,
      block: wrappedBlock,
      events,
      success:
        events.findIndex((evt) => evt.event.method === "ExtrinsicSuccess") > -1,
    };
  });
}
