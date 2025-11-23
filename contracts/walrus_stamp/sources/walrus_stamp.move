module walrus_stamp::walrus_stamp {
    use sui::event;

    /// Event emitted when a file is stamped
    struct FileStampedEvent has copy, drop {
        blob_id: vector<u8>,
        file_hash: vector<u8>,
        file_name: vector<u8>,
        sender: address,
    }

    /// Public function to stamp a file on-chain
    /// This function accepts blobId, fileHash, and fileName as arguments
    /// and emits an event with this data, making it permanently recorded on-chain
    public fun stamp_file(
        blob_id: vector<u8>,
        file_hash: vector<u8>,
        file_name: vector<u8>,
        ctx: &mut sui::tx_context::TxContext
    ) {
        let sender = sui::tx_context::sender(ctx);
        
        // Emit event with the file stamping data
        event::emit(FileStampedEvent {
            blob_id,
            file_hash,
            file_name,
            sender,
        });
    }
}

