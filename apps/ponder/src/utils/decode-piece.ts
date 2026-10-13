import * as Piece from '@filoz/synapse-core/piece'

export interface DecodedPiece {
  cid: string
  rawSize: bigint
}

export function decodePiece(cidData: { data: `0x${string}` }): DecodedPiece {
  const piece = Piece.from(cidData.data)
  return {
    cid: piece.toString(),
    rawSize: BigInt(piece.size),
  }
}
