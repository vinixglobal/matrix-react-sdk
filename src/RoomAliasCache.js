const aliasToIDMap = new Map();

export function storeRoomAliasInCache(alias, id) {
    aliasToIDMap.set(alias, id);
}

export function getCachedRoomIDForAlias(alias) {
    return aliasToIDMap.get(alias);
}
