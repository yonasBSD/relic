<script>
    import { onMount } from "svelte";
    import { getRelic } from "../../services/api";
    import RelicTable from "../RelicTable.svelte";
    import { getDefaultItemsPerPage, getTypeLabel } from "../../services/typeUtils";
    import { filterRelics } from "../../services/paginationUtils";

    export let processed;
    export let relicId;

    let relics = [];
    let loading = true;
    let error = null;
    let progress = 0;
    let total = 0;
    let searchTerm = '';
    let currentPage = 1;
    let itemsPerPage = 25;

    $: title = processed.meta?.title || "Relic Index";
    $: description = processed.meta?.description || "";

    // Pagination logic
    $: filteredRelics = filterRelics(relics, searchTerm, getTypeLabel);
    $: totalPages = Math.ceil(filteredRelics.length / itemsPerPage);
    $: paginatedRelics = (() => {
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        return filteredRelics.slice(start, end);
    })();

    function goToPage(page) {
        currentPage = Math.max(1, Math.min(page, totalPages));
    }

    async function loadRelics() {
        loading = true;
        error = null;
        relics = [];

        // processed.relics is now an array of objects { id, title?, description?, tags? }
        const items = processed.relics || [];
        total = items.length;

        if (total === 0) {
            loading = false;
            return;
        }

        // Fetch relics in batches to avoid overwhelming the server
        const batchSize = 5;
        const results = [];

        for (let i = 0; i < total; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const promises = batch.map(async (item) => {
                try {
                    const response = await getRelic(item.id);
                    const relicData = response.data;

                    // Apply overrides from the index file
                    if (item.title) relicData.name = item.title;
                    if (item.description)
                        relicData.description = item.description;
                    if (item.tags) relicData.tags = item.tags;

                    return relicData;
                } catch (err) {
                    console.error(`Failed to fetch relic ${item.id}:`, err);
                    return {
                        id: item.id,
                        name: item.title || "Unknown Relic",
                        description:
                            item.description || "Failed to load relic details",
                        error: true,
                    };
                }
            });

            const batchResults = await Promise.all(promises);
            results.push(...batchResults);
            progress = Math.min(results.length, total);

            // Update relics progressively
            relics = [...results];
        }

        loading = false;
    }

    onMount(() => {
        itemsPerPage = getDefaultItemsPerPage();
        loadRelics();
    });
</script>

<div class="space-y-4">
    {#if error}
        <div
            class="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
        >
            {error}
        </div>
    {/if}

    <RelicTable
        data={filteredRelics}
        {loading}
        bind:searchTerm
        bind:currentPage
        bind:itemsPerPage
        {totalPages}
        paginatedData={paginatedRelics}
        title={loading ? `${title} (${progress}/${total})` : title}
        titleIcon="fa-list-ul"
        titleIconColor="text-purple-600"
        emptyMessage="No valid relics found in this index."
        emptyMessageWithSearch="No matching relics found in this index."
        tableId="relic-index"
        showForkButton={true}
        {goToPage}
    />
</div>
