<template>
    <v-card variant="flat" class="reconciliation-statement-panel pa-2" v-if="accountId">
        <template #title>
            <div class="d-flex align-center">
                <span class="text-h6 text-truncate">{{ currentAccount?.name || tt('Reconciliation Statement') }}</span>
                <v-btn density="compact" color="default" variant="text" size="24"
                       class="ms-2" :icon="true" :loading="loading" @click="reload(true)">
                    <template #loader>
                        <v-progress-circular indeterminate size="20"/>
                    </template>
                    <v-icon :icon="mdiRefresh" size="24" />
                    <v-tooltip activator="parent">{{ tt('Refresh') }}</v-tooltip>
                </v-btn>
                <v-spacer/>
                <v-btn density="compact" color="default" variant="text" size="24"
                       :icon="true" @click="emit('close')">
                    <v-icon :icon="mdiClose" size="24" />
                    <v-tooltip activator="parent">{{ tt('Close') }}</v-tooltip>
                </v-btn>
            </div>
        </template>

        <template #subtitle>
            <div class="text-body-2 mt-1" v-if="!startTime && !endTime">
                <span>{{ tt('All') }}</span>
            </div>
            <div class="text-body-2 mt-1" v-else>
                <span>{{ displayStartDateTime }}</span>
                <span> - </span>
                <span>{{ displayEndDateTime }}</span>
            </div>
        </template>

        <v-card-text class="pt-0">
            <div class="d-flex flex-wrap align-center text-body-2 mb-3">
                <div class="me-4">
                    <span>{{ tt('Opening Balance') }}</span>
                    <span class="text-primary ms-1" v-if="loading">
                        <v-skeleton-loader class="skeleton-no-margin d-inline-block" type="text" style="width: 80px" :loading="true"></v-skeleton-loader>
                    </span>
                    <span class="text-primary ms-1" v-else>{{ displayOpeningBalance }}</span>
                </div>
                <div class="me-4">
                    <span>{{ tt('Closing Balance') }}</span>
                    <span class="text-primary ms-1" v-if="loading">
                        <v-skeleton-loader class="skeleton-no-margin d-inline-block" type="text" style="width: 80px" :loading="true"></v-skeleton-loader>
                    </span>
                    <span class="text-primary ms-1" v-else>{{ displayClosingBalance }}</span>
                </div>
                <div class="me-4">
                    <span>{{ tt('Total Inflows') }}</span>
                    <span class="text-income ms-1" v-if="loading">
                        <v-skeleton-loader class="skeleton-no-margin d-inline-block" type="text" style="width: 80px" :loading="true"></v-skeleton-loader>
                    </span>
                    <span class="text-income ms-1" v-else>{{ displayTotalInflows }}</span>
                </div>
                <div>
                    <span>{{ tt('Total Outflows') }}</span>
                    <span class="text-expense ms-1" v-if="loading">
                        <v-skeleton-loader class="skeleton-no-margin d-inline-block" type="text" style="width: 80px" :loading="true"></v-skeleton-loader>
                    </span>
                    <span class="text-expense ms-1" v-else>{{ displayTotalOutflows }}</span>
                </div>
            </div>

            <v-data-table
                fixed-header
                multi-sort
                density="compact"
                item-value="index"
                :class="{ 'reconciliation-statement-panel-table': true, 'disabled': loading }"
                :height="dataTableHeight"
                :headers="dataTableHeaders"
                :items="reconciliationStatements?.transactions ?? []"
                :hover="true"
                :no-data-text="loading ? '' : tt('No transaction data')"
                v-model:items-per-page="countPerPage"
                v-model:page="currentPage"
            >
                <template #item.time="{ item }">
                    <span>{{ getDisplayDateTime(item) }}</span>
                </template>
                <template #item.type="{ item }">
                    <v-chip label variant="outlined" size="x-small"
                            :class="{ 'text-income' : item.type === TransactionType.Income, 'text-expense': item.type === TransactionType.Expense }"
                            :color="getTransactionTypeColor(item)">{{ getDisplayTransactionType(item) }}</v-chip>
                </template>
                <template #item.categoryName="{ item }">
                    <div class="d-flex align-center">
                        <ItemIcon size="20px" icon-type="category"
                                  :icon-id="item.category?.icon ?? ''"
                                  :color="item.category?.color ?? ''"
                                  v-if="item.category && item.category?.color"></ItemIcon>
                        <v-icon size="20" :icon="mdiPencilBoxOutline" v-else-if="!item.category || !item.category?.color" />
                        <span class="ms-2" v-if="item.type === TransactionType.ModifyBalance">
                            {{ tt('Modify Balance') }}
                        </span>
                        <span class="ms-2" v-else-if="item.type !== TransactionType.ModifyBalance && item.category">
                            {{ item.category?.name }}
                        </span>
                    </div>
                </template>
                <template #item.sourceAmount="{ item }">
                    <span :class="{ 'text-expense': item.type === TransactionType.Expense, 'text-income': item.type === TransactionType.Income }">{{ getDisplaySourceAmount(item) }}</span>
                </template>
                <template #item.accountBalance="{ item }">
                    <span>{{ getDisplayAccountBalance(item) }}</span>
                </template>
                <template #item.operation="{ item }">
                    <v-btn density="compact" variant="text" color="default" :disabled="loading || item.type === TransactionType.ModifyBalance"
                           @click="showTransaction(item)">
                        {{ tt('View') }}
                    </v-btn>
                </template>
                <template #bottom>
                    <div class="d-flex align-center text-no-wrap mt-2 px-2" v-if="loading || (reconciliationStatements && reconciliationStatements.transactions && reconciliationStatements.transactions.length)">
                        <span>{{ tt('Total Transactions') }}</span>
                        <span class="ms-2" v-if="!loading">{{ formatNumberToLocalizedNumerals(reconciliationStatements?.transactions.length ?? 0) }}</span>
                        <v-spacer/>
                        <span v-if="reconciliationStatements && reconciliationStatements.transactions && reconciliationStatements.transactions.length > 10">
                            {{ tt('Transactions Per Page') }}
                        </span>
                        <v-select class="ms-2" density="compact" max-width="100"
                                  item-title="name"
                                  item-value="value"
                                  :disabled="loading"
                                  :items="reconciliationStatementsTablePageOptions"
                                  v-model="countPerPage"
                                  v-if="reconciliationStatements && reconciliationStatements.transactions && reconciliationStatements.transactions.length > 10"
                        />
                        <pagination-buttons density="compact"
                                            :disabled="loading"
                                            :totalPageCount="totalPageCount"
                                            v-model="currentPage"
                                            v-if="reconciliationStatements && reconciliationStatements.transactions && reconciliationStatements.transactions.length > 10">
                        </pagination-buttons>
                    </div>
                </template>
            </v-data-table>
        </v-card-text>

        <edit-dialog ref="editDialog" :type="TransactionEditPageType.Transaction" />
        <snack-bar ref="snackbar" />
    </v-card>
</template>

<script setup lang="ts">
import PaginationButtons from '@/components/desktop/PaginationButtons.vue';
import SnackBar from '@/components/desktop/SnackBar.vue';
import EditDialog from '@/views/desktop/transactions/list/dialogs/EditDialog.vue';
import { TransactionEditPageType } from '@/views/base/transactions/TransactionEditPageBase.ts';

import { ref, computed, useTemplateRef, watch } from 'vue';

import { useI18n } from '@/locales/helpers.ts';
import { useReconciliationStatementPageBase } from '@/views/base/accounts/ReconciliationStatementPageBase.ts';

import { useAccountsStore } from '@/stores/account.ts';
import { useTransactionCategoriesStore } from '@/stores/transactionCategory.ts';
import { useTransactionsStore } from '@/stores/transaction.ts';

import type { NameNumeralValue } from '@/core/base.ts';
import type { NumeralSystem } from '@/core/numeral.ts';
import { TransactionType } from '@/core/transaction.ts';
import { Transaction, type TransactionReconciliationStatementResponseItem } from '@/models/transaction.ts';

import { mdiRefresh, mdiClose, mdiPencilBoxOutline } from '@mdi/js';

interface ReconciliationStatementPanelProps {
    accountId: string;
    startTime?: number;
    endTime?: number;
}

const props = withDefaults(defineProps<ReconciliationStatementPanelProps>(), {
    startTime: 0,
    endTime: 0
});

const emit = defineEmits<{
    (e: 'close'): void;
    (e: 'transactions-updated'): void;
    (e: 'error', message: string): void;
}>();

type SnackBarType = InstanceType<typeof SnackBar>;
type EditDialogType = InstanceType<typeof EditDialog>;

const { tt, getCurrentNumeralSystemType, formatNumberToLocalizedNumerals } = useI18n();

const {
    accountId: composableAccountId,
    startTime: composableStartTime,
    endTime: composableEndTime,
    reconciliationStatements,
    currentAccount,
    isCurrentLiabilityAccount,
    displayStartDateTime,
    displayEndDateTime,
    displayTotalInflows,
    displayTotalOutflows,
    displayOpeningBalance,
    displayClosingBalance,
    setReconciliationStatements,
    getDisplayTransactionType,
    getDisplayDateTime,
    getDisplaySourceAmount,
    getDisplayAccountBalance
} = useReconciliationStatementPageBase();

const accountsStore = useAccountsStore();
const transactionCategoriesStore = useTransactionCategoriesStore();
const transactionsStore = useTransactionsStore();

const snackbar = useTemplateRef<SnackBarType>('snackbar');
const editDialog = useTemplateRef<EditDialogType>('editDialog');

const loading = ref<boolean>(false);
const currentPage = ref<number>(1);
const countPerPage = ref<number>(15);

const numeralSystem = computed<NumeralSystem>(() => getCurrentNumeralSystemType());

const reconciliationStatementsTablePageOptions = computed<NameNumeralValue[]>(() => {
    const linesCount = reconciliationStatements.value?.transactions.length;
    const pageOptions: NameNumeralValue[] = [];

    if (!linesCount || linesCount < 1) {
        pageOptions.push({ value: -1, name: tt('All') });
        return pageOptions;
    }

    const availableCountPerPage = [ 5, 10, 15, 20, 25, 30, 50, 100, 200, 500, 1000 ];

    for (const count of availableCountPerPage) {
        if (linesCount < count) {
            break;
        }

        pageOptions.push({ value: count, name: numeralSystem.value.formatNumber(count) });
    }

    pageOptions.push({ value: -1, name: tt('All') });
    return pageOptions;
});

const totalPageCount = computed<number>(() => {
    if (!reconciliationStatements.value || !reconciliationStatements.value.transactions || reconciliationStatements.value.transactions.length < 1) {
        return 1;
    }

    const count = reconciliationStatements.value.transactions.length;
    return Math.ceil(count / countPerPage.value);
});

const dataTableHeight = computed<number>(() => 600);

const dataTableHeaders = computed<object[]>(() => {
    const headers: object[] = [];
    const accountBalanceName = isCurrentLiabilityAccount.value ? 'Account Outstanding Balance' : 'Account Balance';

    headers.push({ key: 'time', value: 'time', title: tt('Transaction Time'), sortable: true, nowrap: true });
    headers.push({ key: 'type', value: 'type', title: tt('Type'), sortable: true, nowrap: true });
    headers.push({ key: 'categoryName', value: 'categoryName', title: tt('Category'), sortable: true, nowrap: true });
    headers.push({ key: 'sourceAmount', value: 'sourceAmount', title: tt('Amount'), sortable: true, nowrap: true });
    headers.push({ key: 'accountBalance', value: 'accountBalance', title: tt(accountBalanceName), sortable: true, nowrap: true });
    headers.push({ key: 'comment', value: 'comment', title: tt('Description'), sortable: true, nowrap: true });
    headers.push({ key: 'operation', title: tt('Operation'), sortable: false, nowrap: true, align: 'center' });
    return headers;
});

function getTransactionTypeColor(transaction: TransactionReconciliationStatementResponseItem): string | undefined {
    if (transaction.type === TransactionType.ModifyBalance) {
        return 'secondary';
    } else if (transaction.type === TransactionType.Transfer) {
        return 'primary';
    }
    return undefined;
}

function load(): void {
    if (!props.accountId) {
        reconciliationStatements.value = undefined;
        return;
    }

    composableAccountId.value = props.accountId;
    composableStartTime.value = props.startTime;
    composableEndTime.value = props.endTime;
    reconciliationStatements.value = undefined;
    currentPage.value = 1;
    loading.value = true;

    Promise.all([
        accountsStore.loadAllAccounts({ force: false }),
        transactionCategoriesStore.loadAllCategories({ force: false })
    ]).then(() => {
        return transactionsStore.getReconciliationStatements({
            accountId: props.accountId,
            startTime: props.startTime,
            endTime: props.endTime
        });
    }).then(result => {
        if (composableAccountId.value !== props.accountId) {
            return;
        }
        setReconciliationStatements(result);
        loading.value = false;
    }).catch(error => {
        loading.value = false;

        if (!error.processed) {
            emit('error', error?.message || 'Failed to load reconciliation statement');
        }
    });
}

function reload(force: boolean): void {
    if (!props.accountId) {
        return;
    }

    loading.value = true;

    transactionsStore.getReconciliationStatements({
        accountId: composableAccountId.value,
        startTime: composableStartTime.value,
        endTime: composableEndTime.value
    }).then(result => {
        if (force) {
            snackbar.value?.showMessage('Data has been updated');
        }

        setReconciliationStatements(result);
        loading.value = false;
    }).catch(error => {
        loading.value = false;

        if (!error.processed) {
            snackbar.value?.showError(error);
        }
    });
}

function showTransaction(transaction: TransactionReconciliationStatementResponseItem): void {
    if (transaction.type === TransactionType.ModifyBalance) {
        return;
    }

    editDialog.value?.open({
        id: transaction.id,
        currentTransaction: Transaction.of(transaction)
    }).then(result => {
        if (result && result.message) {
            snackbar.value?.showMessage(result.message);
        }

        reload(false);
        emit('transactions-updated');
    }).catch(error => {
        if (error) {
            snackbar.value?.showError(error);
        }
    });
}

watch(() => [props.accountId, props.startTime, props.endTime], () => {
    load();
}, { immediate: true });
</script>

<style>
.reconciliation-statement-panel-table > .v-table__wrapper > table {
    th:not(:nth-last-child(2)),
    td:not(:nth-last-child(2)) {
        width: auto !important;
        white-space: nowrap;
    }

    th:nth-last-child(2),
    td:nth-last-child(2) {
        width: 100% !important;
    }
}
</style>
