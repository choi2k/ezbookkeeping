<template>
    <v-row class="match-height">
        <v-col cols="12" :md="showTransactions ? 8 : 12">
            <v-card>
                <template #title>
                    <div class="title-and-toolbar d-flex align-center">
                        <span>{{ tt('Monthly Overview') }}</span>
                        <v-btn-group class="ms-4" color="default" density="comfortable" variant="outlined" divided>
                            <v-btn class="button-icon-with-direction" :icon="mdiArrowLeft"
                                   :disabled="loading" @click="shiftMonthRange(-1)"/>
                            <v-btn :disabled="loading" @click="showCustomMonthRangeDialog = true">{{ displayMonthRange }}</v-btn>
                            <v-btn class="button-icon-with-direction" :icon="mdiArrowRight"
                                   :disabled="loading" @click="shiftMonthRange(1)"/>
                        </v-btn-group>
                        <v-btn density="compact" color="default" variant="text" size="24"
                               class="ms-2" :icon="true" :loading="loading" @click="reload">
                            <template #loader>
                                <v-progress-circular indeterminate size="20"/>
                            </template>
                            <v-icon :icon="mdiRefresh" size="24" />
                            <v-tooltip activator="parent">{{ tt('Refresh') }}</v-tooltip>
                        </v-btn>
                        <v-spacer />
                        <v-btn color="primary" :variant="showTransactions ? 'flat' : 'outlined'"
                               :prepend-icon="mdiListBoxOutline"
                               @click="toggleTransactions">{{ tt('Show Transactions') }}</v-btn>
                    </div>
                </template>

                <v-card-text :class="{ 'readonly': loading }">
                    <div class="text-subtitle-1 mb-1">
                        <span>{{ selectedMonthIndex >= 0 ? allMonths[selectedMonthIndex]?.displayName : displayMonthRange }}</span>
                    </div>
                    <v-chart ref="chart" autoresize class="monthly-overview-chart" :option="chartOptions" @zr:click="onClickChart" />
                </v-card-text>

                <v-card-text v-if="!focusedPrimaryCategory">
                    <template :key="section.type" v-for="section in overviewSections">
                        <div class="monthly-overview-section-title d-flex align-center">
                            <span class="text-h6">{{ section.title }}</span>
                            <v-spacer />
                            <span class="text-h6" :class="section.textClass">{{ formatAmount(section.totalAmount) }}</span>
                        </div>
                        <div class="monthly-overview-category-grid" v-if="section.items.length">
                            <div class="monthly-overview-category-item cursor-pointer"
                                 :key="item.category.id" v-for="item in section.items"
                                 @click="selectPrimaryCategory(item.category)">
                                <div class="monthly-overview-category-ring" :style="getRingStyle(item.percent, section.color)">
                                    <div class="monthly-overview-category-icon">
                                        <ItemIcon icon-type="category" :icon-id="item.category.icon" :color="item.category.color" size="32px" />
                                    </div>
                                </div>
                                <div class="monthly-overview-category-name text-truncate">{{ item.category.name }}</div>
                                <div :class="section.textClass">{{ formatAmount(item.amount) }}</div>
                            </div>
                        </div>
                        <div class="text-disabled my-4" v-else>{{ tt('No transaction data') }}</div>
                    </template>
                    <div class="monthly-overview-section-title d-flex align-center">
                        <span class="text-h6">{{ tt('Net Income') }}</span>
                        <v-spacer />
                        <span class="text-h6">{{ formatAmount(totalIncome - totalExpense) }}</span>
                    </div>
                </v-card-text>

                <v-card-text v-else>
                    <div class="monthly-overview-section-title d-flex align-center">
                        <v-btn density="comfortable" color="default" variant="tonal" :icon="mdiChevronLeft"
                               @click="selectPrimaryCategory(null)">
                            <v-icon :icon="mdiChevronLeft" />
                            <v-tooltip activator="parent">{{ tt('Back') }}</v-tooltip>
                        </v-btn>
                        <ItemIcon class="ms-3" icon-type="category" :icon-id="focusedPrimaryCategory.icon" :color="focusedPrimaryCategory.color" />
                        <span class="text-h6 ms-2">{{ focusedPrimaryCategory.name }}</span>
                        <v-spacer />
                        <span class="text-h6" :class="focusedSection.textClass">{{ formatAmount(focusedSection.totalAmount) }}</span>
                    </div>
                    <div class="monthly-overview-category-grid" v-if="focusedSection.items.length">
                        <div class="monthly-overview-category-item cursor-pointer"
                             :class="{ 'monthly-overview-category-item-dimmed': focusedSecondaryCategory && focusedSecondaryCategory.id !== item.category.id }"
                             :key="item.category.id" v-for="item in focusedSection.items"
                             @click="toggleSecondaryCategory(item.category)">
                            <div class="monthly-overview-category-ring" :style="getRingStyle(item.percent, focusedSection.color)">
                                <div class="monthly-overview-category-icon">
                                    <ItemIcon icon-type="category" :icon-id="item.category.icon" :color="item.category.color" size="32px" />
                                </div>
                            </div>
                            <div class="monthly-overview-category-name text-truncate">{{ item.category.name }}</div>
                            <div :class="focusedSection.textClass">{{ formatAmount(item.amount) }}</div>
                        </div>
                    </div>
                    <div class="text-disabled my-4" v-else>{{ tt('No transaction data') }}</div>
                </v-card-text>
            </v-card>
        </v-col>
        <v-col cols="12" md="4" v-if="showTransactions">
            <v-card class="monthly-overview-transactions">
                <template #title>
                    <div class="d-flex align-center">
                        <span>{{ tt('Transactions') }}</span>
                        <v-spacer />
                        <v-btn density="compact" color="default" variant="text" :icon="mdiClose"
                               @click="showTransactions = false">
                            <v-icon :icon="mdiClose" />
                            <v-tooltip activator="parent">{{ tt('Close') }}</v-tooltip>
                        </v-btn>
                    </div>
                </template>
                <template #subtitle>
                    <span>{{ transactionsScopeName }}</span>
                </template>
                <v-list class="py-0">
                    <template :key="transaction.id" v-for="transaction in transactions">
                        <v-list-item class="py-2">
                            <template #prepend>
                                <ItemIcon class="me-3" icon-type="category"
                                          :icon-id="getTransactionCategory(transaction)?.icon ?? ''"
                                          :color="getTransactionCategory(transaction)?.color" />
                            </template>
                            <v-list-item-title>
                                <span>{{ getTransactionCategory(transaction)?.name }}</span>
                                <span class="text-medium-emphasis" v-if="transaction.comment"> ({{ transaction.comment }})</span>
                            </v-list-item-title>
                            <v-list-item-subtitle>
                                <span>{{ formatTransactionDate(transaction) }}</span>
                                <span class="ms-2">{{ accountsStore.allAccountsMap[transaction.sourceAccountId]?.name }}</span>
                            </v-list-item-subtitle>
                            <template #append>
                                <span class="ms-3 text-no-wrap" :class="transaction.type === TransactionType.Income ? 'text-income' : 'text-expense'">
                                    {{ formatTransactionAmount(transaction) }}
                                </span>
                            </template>
                        </v-list-item>
                        <v-divider />
                    </template>
                </v-list>
                <v-card-text class="text-disabled" v-if="!transactionsLoading && !transactions.length">{{ tt('No transaction data') }}</v-card-text>
                <v-card-text class="d-flex justify-center" v-if="transactionsLoading || transactionsNextTimeId">
                    <v-btn variant="tonal" :loading="transactionsLoading" @click="loadTransactions(false)">{{ tt('Load More') }}</v-btn>
                </v-card-text>
            </v-card>
        </v-col>
    </v-row>

    <month-range-selection-dialog :title="tt('Custom Date Range')"
                                  :min-time="startYearMonth"
                                  :max-time="endYearMonth"
                                  v-model:show="showCustomMonthRangeDialog"
                                  @dateRange:change="setCustomMonthRange"
                                  @error="onShowDateRangeError" />

    <snack-bar ref="snackbar" />
</template>

<script setup lang="ts">
import SnackBar from '@/components/desktop/SnackBar.vue';
import VChart from 'vue-echarts';

import { ref, computed, useTemplateRef, watch } from 'vue';
import { useTheme } from 'vuetify';
import type { EChartsCoreOption, ElementEvent } from 'echarts/core';

import { useI18n } from '@/locales/helpers.ts';

import { useSettingsStore } from '@/stores/setting.ts';
import { useUserStore } from '@/stores/user.ts';
import { useAccountsStore } from '@/stores/account.ts';
import { useTransactionCategoriesStore } from '@/stores/transactionCategory.ts';
import { useExchangeRatesStore } from '@/stores/exchangeRates.ts';

import type { TextualYearMonth, Year0BasedMonth } from '@/core/datetime.ts';
import { CategoryType } from '@/core/category.ts';
import { ThemeType } from '@/core/theme.ts';
import { TimezoneTypeForStatistics } from '@/core/timezone.ts';
import { TransactionType } from '@/core/transaction.ts';
import type { TransactionCategory } from '@/models/transaction_category.ts';
import type { TransactionInfoResponse, TransactionStatisticTrendsResponseItem } from '@/models/transaction.ts';

import { isNumber } from '@/lib/common.ts';
import {
    getCurrentUnixTime,
    getYear0BasedMonthObjectFromUnixTime,
    getYear0BasedMonthObjectFromString,
    getYearMonthStringFromYear0BasedMonthObject,
    getYearMonthFirstUnixTime,
    getYearMonthLastUnixTime,
    parseDateTimeFromUnixTime,
    parseDateTimeFromUnixTimeWithTimezoneOffset
} from '@/lib/datetime.ts';
import { getExpenseAndIncomeAmountColor } from '@/lib/ui/common.ts';
import services from '@/lib/services.ts';
import logger from '@/lib/logger.ts';

import {
    mdiArrowLeft,
    mdiArrowRight,
    mdiChevronLeft,
    mdiClose,
    mdiListBoxOutline,
    mdiRefresh
} from '@mdi/js';

type SnackBarType = InstanceType<typeof SnackBar>;
type VChartType = InstanceType<typeof VChart>;

interface MonthInfo {
    readonly year: number;
    readonly month1base: number;
    readonly displayName: string;
}

interface TransactionsScope {
    readonly minTime: number;
    readonly maxTime: number;
    readonly categoryIds: string;
}

interface CategoryAmountItem {
    readonly category: TransactionCategory;
    readonly amount: number;
    readonly percent: number;
}

interface CategorySection {
    readonly type: CategoryType;
    readonly title: string;
    readonly textClass: string;
    readonly color: string;
    readonly totalAmount: number;
    readonly items: CategoryAmountItem[];
}

const DEFAULT_MONTH_COUNT = 12;
const TRANSACTIONS_PAGE_SIZE = 50;

const theme = useTheme();
const { tt, formatAmountToLocalizedNumeralsWithCurrency, formatDateTimeToGregorianLikeShortYearMonth, formatDateTimeToShortDate } = useI18n();

const settingsStore = useSettingsStore();
const userStore = useUserStore();
const accountsStore = useAccountsStore();
const transactionCategoriesStore = useTransactionCategoriesStore();
const exchangeRatesStore = useExchangeRatesStore();

const snackbar = useTemplateRef<SnackBarType>('snackbar');
const chart = useTemplateRef<VChartType>('chart');

const currentMonth = getYear0BasedMonthObjectFromUnixTime(getCurrentUnixTime());

const loading = ref<boolean>(true);
const showCustomMonthRangeDialog = ref<boolean>(false);
const startYearMonth = ref<TextualYearMonth | ''>(getYearMonthStringFromYear0BasedMonthObject(addMonths(currentMonth, -(DEFAULT_MONTH_COUNT - 1))));
const endYearMonth = ref<TextualYearMonth | ''>(getYearMonthStringFromYear0BasedMonthObject(currentMonth));
const trendsData = ref<TransactionStatisticTrendsResponseItem[]>([]);
const selectedMonthIndex = ref<number>(-1);
const focusedPrimaryCategory = ref<TransactionCategory | null>(null);
const focusedSecondaryCategory = ref<TransactionCategory | null>(null);
const showTransactions = ref<boolean>(true);
const transactions = ref<TransactionInfoResponse[]>([]);
const transactionsLoading = ref<boolean>(false);
const transactionsNextTimeId = ref<number>(0);
let transactionsRequestId = 0;

const defaultCurrency = computed<string>(() => userStore.currentUserDefaultCurrency);
const isDarkMode = computed<boolean>(() => theme.global.name.value === ThemeType.Dark);
const amountColors = computed(() => getExpenseAndIncomeAmountColor(userStore.currentUserExpenseAmountColor, userStore.currentUserIncomeAmountColor, isDarkMode.value));

const allMonths = computed<MonthInfo[]>(() => {
    const start = getYear0BasedMonthObjectFromString(startYearMonth.value);
    const end = getYear0BasedMonthObjectFromString(endYearMonth.value);
    const months: MonthInfo[] = [];

    if (!start || !end) {
        return months;
    }

    for (let month = start; getMonthDiff(month, end) >= 0; month = addMonths(month, 1)) {
        months.push({
            year: month.year,
            month1base: month.month0base + 1,
            displayName: formatDateTimeToGregorianLikeShortYearMonth(parseDateTimeFromUnixTime(getYearMonthFirstUnixTime(month)))
        });
    }

    return months;
});

const displayMonthRange = computed<string>(() => {
    const first = allMonths.value[0];
    const last = allMonths.value[allMonths.value.length - 1];
    return first && last ? `${first.displayName} - ${last.displayName}` : '';
});

// amounts in default currency, indexed by month index then leaf category id
const monthlyCategoryAmounts = computed<Record<string, number>[]>(() => {
    const result: Record<string, number>[] = allMonths.value.map(() => ({}));
    const monthIndexes: Record<string, number> = {};

    allMonths.value.forEach((month, index) => {
        monthIndexes[`${month.year}-${month.month1base}`] = index;
    });

    for (const trendItem of trendsData.value) {
        const monthIndex = monthIndexes[`${trendItem.year}-${trendItem.month}`];
        const amounts = isNumber(monthIndex) ? result[monthIndex] : undefined;

        if (!amounts) {
            continue;
        }

        for (const item of trendItem.items) {
            const account = accountsStore.allAccountsMap[item.accountId];
            const category = transactionCategoriesStore.allTransactionCategoriesMap[item.categoryId];

            if (!account || !category || (category.type !== CategoryType.Income && category.type !== CategoryType.Expense)) {
                continue;
            }

            const amount = account.currency === defaultCurrency.value ? item.amount : exchangeRatesStore.getExchangedAmount(item.amount, account.currency, defaultCurrency.value);

            if (!isNumber(amount)) {
                continue;
            }

            amounts[item.categoryId] = (amounts[item.categoryId] ?? 0) + Math.trunc(amount);
        }
    }

    return result;
});

const selectedCategoryAmounts = computed<Record<string, number>>(() => {
    if (selectedMonthIndex.value >= 0) {
        return monthlyCategoryAmounts.value[selectedMonthIndex.value] ?? {};
    }

    const total: Record<string, number> = {};

    for (const amounts of monthlyCategoryAmounts.value) {
        for (const [categoryId, amount] of Object.entries(amounts)) {
            total[categoryId] = (total[categoryId] ?? 0) + amount;
        }
    }

    return total;
});

const overviewSections = computed<CategorySection[]>(() => [
    buildSection(CategoryType.Expense, tt('Expense'), getPrimaryCategoryAmounts(selectedCategoryAmounts.value, CategoryType.Expense)),
    buildSection(CategoryType.Income, tt('Income'), getPrimaryCategoryAmounts(selectedCategoryAmounts.value, CategoryType.Income))
]);

const totalExpense = computed<number>(() => overviewSections.value[0]?.totalAmount ?? 0);
const totalIncome = computed<number>(() => overviewSections.value[1]?.totalAmount ?? 0);

const focusedSection = computed<CategorySection>(() => {
    const primaryCategory = focusedPrimaryCategory.value;
    const amounts: Record<string, number> = {};

    if (primaryCategory) {
        for (const [categoryId, amount] of Object.entries(selectedCategoryAmounts.value)) {
            if (getPrimaryCategory(categoryId)?.id === primaryCategory.id) {
                amounts[categoryId] = amount;
            }
        }
    }

    return buildSection(primaryCategory?.type ?? CategoryType.Expense, primaryCategory?.name ?? '', amounts);
});

const monthlyChartValues = computed<number[]>(() => monthlyCategoryAmounts.value.map(amounts => {
    let total = 0;

    for (const [categoryId, amount] of Object.entries(amounts)) {
        const primaryCategory = getPrimaryCategory(categoryId);

        if (!primaryCategory) {
            continue;
        }

        if (focusedSecondaryCategory.value) {
            if (categoryId === focusedSecondaryCategory.value.id) {
                total += amount;
            }
        } else if (focusedPrimaryCategory.value) {
            if (primaryCategory.id === focusedPrimaryCategory.value.id) {
                total += amount;
            }
        } else if (primaryCategory.type === CategoryType.Income) {
            total += amount;
        } else {
            total -= amount;
        }
    }

    return total;
}));

const chartOptions = computed<EChartsCoreOption>(() => {
    const incomeColor = amountColors.value.incomeAmountColor;
    const expenseColor = amountColors.value.expenseAmountColor;
    const focusedColor = focusedPrimaryCategory.value?.type === CategoryType.Income ? incomeColor : expenseColor;

    return {
        grid: { left: 80, right: 20, top: 10, bottom: 30 },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            valueFormatter: (value: number) => formatAmount(value)
        },
        xAxis: {
            type: 'category',
            data: allMonths.value.map(month => month.displayName)
        },
        yAxis: {
            type: 'value',
            minInterval: 1,
            axisLabel: { formatter: (value: number) => formatAmount(value) },
            splitLine: { lineStyle: { color: isDarkMode.value ? '#4f4f4f' : '#e1e6f2' } }
        },
        series: [{
            type: 'bar',
            barMaxWidth: 60,
            data: monthlyChartValues.value.map((value, index) => {
                const isDimmed = selectedMonthIndex.value >= 0 && selectedMonthIndex.value !== index;

                return {
                    value: value,
                    itemStyle: {
                        color: focusedPrimaryCategory.value ? focusedColor : (value >= 0 ? incomeColor : expenseColor),
                        opacity: isDimmed ? 0.35 : 1
                    }
                };
            })
        }]
    };
});

const transactionsScope = computed<TransactionsScope>(() => {
    const selectedMonth = selectedMonthIndex.value >= 0 ? allMonths.value[selectedMonthIndex.value] : undefined;
    const firstMonth = selectedMonth ?? allMonths.value[0];
    const lastMonth = selectedMonth ?? allMonths.value[allMonths.value.length - 1];
    let categoryIds: string[] = [];

    if (focusedSecondaryCategory.value) {
        categoryIds = [focusedSecondaryCategory.value.id];
    } else if (focusedPrimaryCategory.value) {
        categoryIds = [focusedPrimaryCategory.value.id];
    } else {
        for (const category of Object.values(transactionCategoriesStore.allTransactionCategoriesMap)) {
            if (category.parentId === '0' && (category.type === CategoryType.Income || category.type === CategoryType.Expense)) {
                categoryIds.push(category.id);
            }
        }
    }

    return {
        minTime: firstMonth ? getYearMonthFirstUnixTime(firstMonth) : 0,
        maxTime: lastMonth ? getYearMonthLastUnixTime(lastMonth) : 0,
        categoryIds: categoryIds.join(',')
    };
});

const transactionsScopeName = computed<string>(() => {
    const dateName = selectedMonthIndex.value >= 0 ? allMonths.value[selectedMonthIndex.value]?.displayName : displayMonthRange.value;
    const categoryNames: string[] = [];

    if (focusedPrimaryCategory.value) {
        categoryNames.push(focusedPrimaryCategory.value.name);
    }

    if (focusedSecondaryCategory.value) {
        categoryNames.push(focusedSecondaryCategory.value.name);
    }

    return categoryNames.length ? `${dateName} · ${categoryNames.join(' › ')}` : (dateName ?? '');
});

function addMonths(month: Year0BasedMonth, count: number): Year0BasedMonth {
    const totalMonths = month.year * 12 + month.month0base + count;

    return {
        year: Math.floor(totalMonths / 12),
        month0base: totalMonths % 12
    };
}

function getMonthDiff(from: Year0BasedMonth, to: Year0BasedMonth): number {
    return (to.year * 12 + to.month0base) - (from.year * 12 + from.month0base);
}

function getPrimaryCategory(categoryId: string): TransactionCategory | undefined {
    const category = transactionCategoriesStore.allTransactionCategoriesMap[categoryId];

    if (!category || category.parentId === '0') {
        return category;
    }

    return transactionCategoriesStore.allTransactionCategoriesMap[category.parentId];
}

function getPrimaryCategoryAmounts(categoryAmounts: Record<string, number>, type: CategoryType): Record<string, number> {
    const amounts: Record<string, number> = {};

    for (const [categoryId, amount] of Object.entries(categoryAmounts)) {
        const primaryCategory = getPrimaryCategory(categoryId);

        if (primaryCategory && primaryCategory.type === type) {
            amounts[primaryCategory.id] = (amounts[primaryCategory.id] ?? 0) + amount;
        }
    }

    return amounts;
}

function buildSection(type: CategoryType, title: string, amounts: Record<string, number>): CategorySection {
    const isIncome = type === CategoryType.Income;
    let totalAmount = 0;

    for (const amount of Object.values(amounts)) {
        totalAmount += amount;
    }

    const items: CategoryAmountItem[] = [];

    for (const [categoryId, amount] of Object.entries(amounts)) {
        const category = transactionCategoriesStore.allTransactionCategoriesMap[categoryId];

        if (category && amount !== 0) {
            items.push({
                category: category,
                amount: amount,
                percent: totalAmount > 0 ? amount * 100 / totalAmount : 0
            });
        }
    }

    items.sort((item1, item2) => item2.amount - item1.amount);

    return {
        type: type,
        title: title,
        textClass: isIncome ? 'text-income' : 'text-expense',
        color: isIncome ? amountColors.value.incomeAmountColor : amountColors.value.expenseAmountColor,
        totalAmount: totalAmount,
        items: items
    };
}

function formatAmount(amount: number): string {
    return formatAmountToLocalizedNumeralsWithCurrency(amount, defaultCurrency.value);
}

function getRingStyle(percent: number, color: string): Record<string, string> {
    const trackColor = isDarkMode.value ? '#3a3a3a' : '#e0e0e0';
    const degree = Math.max(0, Math.min(100, percent)) * 3.6;

    return {
        background: `conic-gradient(${color} 0deg ${degree}deg, ${trackColor} ${degree}deg 360deg)`
    };
}

function selectPrimaryCategory(category: TransactionCategory | null): void {
    focusedPrimaryCategory.value = category;
    focusedSecondaryCategory.value = null;
}

function toggleSecondaryCategory(category: TransactionCategory): void {
    focusedSecondaryCategory.value = focusedSecondaryCategory.value?.id === category.id ? null : category;
}

// select the month of the clicked column area, not only the bar itself
function onClickChart(e: ElementEvent): void {
    const point = [e.offsetX, e.offsetY];

    if (!chart.value || !chart.value.containPixel('grid', point)) {
        return;
    }

    const [monthIndex] = chart.value.convertFromPixel({ gridIndex: 0 }, point) as number[];

    if (!isNumber(monthIndex) || monthIndex < 0 || monthIndex >= allMonths.value.length) {
        return;
    }

    selectedMonthIndex.value = selectedMonthIndex.value === monthIndex ? -1 : monthIndex;
}

function shiftMonthRange(direction: number): void {
    const start = getYear0BasedMonthObjectFromString(startYearMonth.value);
    const end = getYear0BasedMonthObjectFromString(endYearMonth.value);

    if (!start || !end) {
        return;
    }

    const monthCount = getMonthDiff(start, end) + 1;

    setMonthRange(
        getYearMonthStringFromYear0BasedMonthObject(addMonths(start, direction * monthCount)),
        getYearMonthStringFromYear0BasedMonthObject(addMonths(end, direction * monthCount))
    );
}

function setCustomMonthRange(minYearMonth: TextualYearMonth | '', maxYearMonth: TextualYearMonth | ''): void {
    if (!minYearMonth || !maxYearMonth) {
        return;
    }

    showCustomMonthRangeDialog.value = false;
    setMonthRange(minYearMonth, maxYearMonth);
}

function setMonthRange(minYearMonth: TextualYearMonth | '', maxYearMonth: TextualYearMonth | ''): void {
    startYearMonth.value = minYearMonth;
    endYearMonth.value = maxYearMonth;
    selectedMonthIndex.value = -1;
    reload();
}

function getTransactionCategory(transaction: TransactionInfoResponse): TransactionCategory | undefined {
    return transactionCategoriesStore.allTransactionCategoriesMap[transaction.categoryId];
}

function formatTransactionDate(transaction: TransactionInfoResponse): string {
    return formatDateTimeToShortDate(parseDateTimeFromUnixTimeWithTimezoneOffset(transaction.time, transaction.utcOffset));
}

function formatTransactionAmount(transaction: TransactionInfoResponse): string {
    if (transaction.hideAmount) {
        return '***';
    }

    const account = accountsStore.allAccountsMap[transaction.sourceAccountId];
    return formatAmountToLocalizedNumeralsWithCurrency(transaction.sourceAmount, account?.currency ?? defaultCurrency.value);
}

function toggleTransactions(): void {
    showTransactions.value = !showTransactions.value;

    if (showTransactions.value) {
        loadTransactions(true);
    }
}

function loadTransactions(reset: boolean): void {
    const scope = transactionsScope.value;
    const requestId = ++transactionsRequestId;

    if (reset) {
        transactions.value = [];
        transactionsNextTimeId.value = 0;
    }

    // no income or expense category means no matching transactions, and an empty category filter would return all types
    if (!scope.categoryIds || !scope.maxTime) {
        transactionsLoading.value = false;
        return;
    }

    transactionsLoading.value = true;

    services.getTransactions({
        maxTime: reset ? scope.maxTime * 1000 + 999 : transactionsNextTimeId.value,
        minTime: scope.minTime * 1000,
        count: TRANSACTIONS_PAGE_SIZE,
        page: 1,
        withCount: false,
        type: 0,
        categoryIds: scope.categoryIds,
        accountIds: '',
        tagFilter: '',
        amountFilter: '',
        keyword: ''
    }).then(response => {
        if (requestId !== transactionsRequestId) {
            return;
        }

        const data = response.data;

        if (!data || !data.success || !data.result) {
            throw { message: 'Unable to retrieve transaction list' };
        }

        transactions.value = [...transactions.value, ...data.result.items];
        transactionsNextTimeId.value = data.result.nextTimeSequenceId ?? 0;
        transactionsLoading.value = false;
    }).catch(error => {
        if (requestId !== transactionsRequestId) {
            return;
        }

        transactionsLoading.value = false;
        logger.error('failed to load monthly overview transactions', error);

        if (error.response && error.response.data && error.response.data.errorMessage) {
            snackbar.value?.showError(error.response.data);
        } else if (!error.processed) {
            snackbar.value?.showError(error);
        }
    });
}

function onShowDateRangeError(message: string): void {
    snackbar.value?.showError(message);
}

function reload(): void {
    loading.value = true;

    Promise.all([
        accountsStore.loadAllAccounts({ force: false }),
        transactionCategoriesStore.loadAllCategories({ force: false })
    ]).then(() => services.getTransactionStatisticsTrends({
        startYearMonth: startYearMonth.value,
        endYearMonth: endYearMonth.value,
        tagFilter: '',
        keyword: '',
        useTransactionTimezone: settingsStore.appSettings.statistics.defaultTimezoneType === TimezoneTypeForStatistics.TransactionTimezone.type
    })).then(response => {
        const data = response.data;

        if (!data || !data.success || !data.result) {
            throw { message: 'Unable to retrieve transaction statistics' };
        }

        trendsData.value = data.result;
        loading.value = false;
    }).catch(error => {
        loading.value = false;
        logger.error('failed to retrieve monthly overview data', error);

        if (error.response && error.response.data && error.response.data.errorMessage) {
            snackbar.value?.showError(error.response.data);
        } else if (!error.processed) {
            snackbar.value?.showError(error);
        }
    });
}

watch(transactionsScope, () => {
    if (showTransactions.value) {
        loadTransactions(true);
    }
}, { immediate: true });

reload();
</script>

<style>
.monthly-overview-chart {
    width: 100%;
    height: 280px;
}

.monthly-overview-section-title {
    padding-bottom: 8px;
    margin-top: 16px;
    border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.monthly-overview-category-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 16px;
    margin: 24px 0;
}

.monthly-overview-category-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    min-width: 0;
}

.monthly-overview-category-item-dimmed {
    opacity: 0.4;
}

.monthly-overview-category-ring {
    width: 76px;
    height: 76px;
    padding: 4px;
    border-radius: 50%;
}

.monthly-overview-category-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background-color: rgb(var(--v-theme-surface));
}

.monthly-overview-category-name {
    max-width: 100%;
    margin-top: 8px;
}
</style>
