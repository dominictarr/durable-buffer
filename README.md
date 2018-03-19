# durable-buffer

an on-disk buffer with random writes that makes gaurantees about
what has definitely been written.

## motivation

in [flumedb](https://github.com/flumedb/flumedb), the write ahead
log which fundamentially provides durability to a database is
separate from the views. This means views can be somewhat more lax
about their durability requirements. But views still need to remember
where in the main log they where up to.

This module aims to provide a sparse buffer with random access writes.
Since a single write may in fact be a _batch_ across multiple blocks
in the file, which need to be written separately, and it's possible the system crashes when
some-but-not-all of these have been written. To be "durable",
a database must at least be able to detect (even better: recover)
from a failure like this.

The classic approach would be to first write each write into
a write-ahead-log, then once we are confidant that those writes
are in the log, copy them into the main store (which is structured
to make reads efficient). This would make a fully self contained
database, but it means we write everything twice.
Also, flume already provides a _log_ so we don't need that.

This module instead has a simpler arrangement. You read and write
to blocks (read from the underlying file) blocks that are written
to are _dirty_ (because they have mutated from the copy on disk).
At some point in the future, dirty blocks are written.
We want to write all dirty blocks in a single batch.
When we reopen the file, we want to know wether the last write
fully succeeded or not!

To achive this: first we take the hash of each dirty block,
and write it to a state file - (along with the index of
each block, and a header containing the number of blocks written,
and the hash of all blocks combined)

Then, when we load the file, we check that every block mentioned
in the state file has the hash it should. If it does, we are good.
Else, there was an error, so rebuild the whole view.

## License

MIT





