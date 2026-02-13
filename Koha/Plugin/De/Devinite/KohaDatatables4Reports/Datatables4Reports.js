(function () {
    'use strict';

    // === Check: Only run on the final report RESULT pages ===
    // The plugin JS is injected on every Koha intranet page via intranet_js hook.
    // These early returns ensure we only activate it on the final guided reports result page.
    if (!window.location.pathname.includes('/reports/guided_reports.pl')) {
        return;
    }
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('op') !== 'run' || !urlParams.get('id')) {
        return;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        var toolbar = document.getElementById('toolbar');
        if (!toolbar) return;

        // Only show button when CSV download link exists on the page.
        // Multi-step reports (with parameter prompts) don't have this link yet.
        var csvLink = document.querySelector('a#csv[href*="op=export"]');
        if (!csvLink) return;

        // Get report ID from URL parameters
        var reportId = urlParams.get('id');

        // Reuse the existing CSV export URL (already has all correct parameters)
        var csvUrl = csvLink.getAttribute('href');

        // === Create "Open in DataTables" button in the report toolbar ===
        var btnGroup = document.createElement('div');
        btnGroup.className = 'btn-group';
        btnGroup.id = 'dt4r-btn-group';

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-default dt4r-btn';
        btn.innerHTML = '<i class="fa fa-table"></i> Open in DataTables';
        btn.title = 'Fetch all report data and display in an interactive DataTable';
        btnGroup.appendChild(btn);
        toolbar.appendChild(btnGroup);

        // === Initial Plugin state ===
        var isActive = false;
        var dtInstance = null;
        var allColumns = null;
        var allData = null;

        btn.addEventListener('click', function () {
            if (isActive) {
                restoreOriginalView();
            } else {
                activateDataTables();
            }
        });

        // ======================================================================================
        // DOM HELPERS — find Koha page elements that need to be hidden/shown
        // ======================================================================================

        // Toggle visibility of all original children inside .page-section.
        // This works across Koha versions: older versions use <div class="pages"> for pagination
        // (no ID), newer versions use <nav id="pagination_top/bottom">. By hiding ALL children
        // of .page-section we cover both layouts without needing version-specific selectors.
        // Our DataTables container is excluded because it gets a data attribute marker.
        function setOriginalElementsVisible(visible) {
            var pageSection = document.querySelector('.page-section');
            if (!pageSection) return;
            var display = visible ? '' : 'none';
            var children = pageSection.children;
            for (var i = 0; i < children.length; i++) {
                if (!children[i].hasAttribute('data-dt4r')) {
                    children[i].style.display = display;
                }
            }
        }

        // ======================================================================================
        // ACTIVATE — fetch CSV data, build DataTable
        // ======================================================================================
        function activateDataTables() {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Loading...';

            fetch(csvUrl, { credentials: 'same-origin' })
                .then(function (response) {
                    if (!response.ok) throw new Error('HTTP ' + response.status + ': ' + response.statusText);
                    return response.text();
                })
                .then(function (csvText) {
                    if (!csvText || !csvText.trim()) throw new Error('The report returned no data.');

                    var parsed = parseCSV(csvText);
                    if (parsed.length < 1) throw new Error('Could not parse CSV data.');

                    allColumns = parsed[0];
                    allData = parsed.slice(1);

                    // Normalize row lengths to match header count
                    var colCount = allColumns.length;
                    allData = allData.map(function (row) {
                        while (row.length < colCount) row.push('');
                        return row.slice(0, colCount);
                    });

                    buildDataTablesView();
                })
                .catch(function (err) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fa fa-table"></i> Open in DataTables';
                    // Alert box makes more sense than failing silently in the console.
                    alert('DataTables Plugin Error: ' + err.message);
                });
        }

        // ==============================================================================================
        // BUILD — create container, table, initialize DataTable
        // ==============================================================================================
        function buildDataTablesView() {
            // Hide Koha's original table, pagination, toolbar, results count
            setOriginalElementsVisible(false);

            // Container (data-dt4r attribute marks it as ours, so setOriginalElementsVisible skips it)
            var container = document.createElement('div');
            container.id = 'dt4r-container';
            container.setAttribute('data-dt4r', '1');

            // Info bar with row count
            var infoBar = document.createElement('div');
            infoBar.className = 'dt4r-infobar';
            infoBar.innerHTML = '<i class="fa fa-table"></i> DataTables view - <strong>' + allData.length + '</strong> total rows loaded';
            container.appendChild(infoBar);

            // Build HTML table structure
            var table = document.createElement('table');
            table.id = 'dt4r-table';
            table.className = 'table table-striped table-bordered';
            table.style.width = '100%';

            var thead = document.createElement('thead');
            var headerRow = document.createElement('tr');

            allColumns.forEach(function (col) {
                var th = document.createElement('th');
                th.textContent = col;
                headerRow.appendChild(th);
            });

            thead.appendChild(headerRow);
            table.appendChild(thead);
            table.appendChild(document.createElement('tbody'));
            container.appendChild(table);

            // Insert container as first child of .page-section (above the hidden original elements)
            var pageSection = document.querySelector('.page-section');
            if (pageSection) {
                pageSection.insertBefore(container, pageSection.firstChild);
            }

            // ============================================================================================================
            // Initialize DataTable
            // ============================================================================================================ 
            // topbar (length + filter + buttons) | sub-topbar (info + pagination) | table | sub-topbar (info + pagination)
            // ============================================================================================================
            dtInstance = $('#dt4r-table').DataTable({
                data: allData,
                pageLength: 100,
                lengthMenu: [[10, 25, 50, 100, 250, 500, -1], [10, 25, 50, 100, 250, 500, "All"]],
                deferRender: true,
                autoWidth: false,
                scrollX: false,
                fixedHeader: true,
                // Export buttons that work with Koha's bundled modules: Buttons 3.1.2 + JSZip + pdfmake.
                // Always ensure that they respect current filter, sort order and column visibility.
                // TODO: Maybe change this into another dropdown menu for smaller screens?
                buttons: [
                    {
                        extend: 'colvis',
                        text: '<i class="fa fa-table-columns"></i> Columns',
                        titleAttr: 'Show/hide columns',
                        className: 'btn btn-default btn-xs'
                    },
                    // Separator label "Filtered Data Options" before export buttons (inserted as DOM element after init)
                    {
                        extend: 'copy',
                        text: '<i class="fa fa-copy"></i> Copy',
                        className: 'btn btn-default btn-xs dt4r-export-btn',
                        exportOptions: { columns: ':visible' }
                    },
                    {
                        extend: 'csv',
                        text: '<i class="fa fa-file-csv"></i> CSV',
                        className: 'btn btn-default btn-xs dt4r-export-btn',
                        fieldSeparator: ';',
                        exportOptions: { columns: ':visible' }
                    },
                    {
                        extend: 'excel',
                        text: '<i class="fa fa-file-excel"></i> Excel',
                        className: 'btn btn-default btn-xs dt4r-export-btn',
                        exportOptions: { columns: ':visible' }
                    },
                    {
                        extend: 'pdf',
                        text: '<i class="fa fa-file-pdf"></i> PDF',
                        className: 'btn btn-default btn-xs dt4r-export-btn',
                        orientation: 'landscape',
                        exportOptions: { columns: ':visible' },
                        customize: function (doc) {
                            // When "Fit To Page" is active, auto-size columns to fill page width
                            if (table.classList.contains('dt4r-fitpage')) {
                                var colCount = doc.content[1].table.body[0].length;
                                doc.content[1].table.widths = Array(colCount).fill('*');
                            }
                        }
                    },
                    {
                        extend: 'print',
                        text: '<i class="fa fa-print"></i> Print',
                        className: 'btn btn-default btn-xs dt4r-export-btn',
                        exportOptions: { columns: ':visible' },
                        customize: function (win) {
                            // When "Fit To Page" is active, constrain the print table to page width
                            if (table.classList.contains('dt4r-fitpage')) {
                                var printTable = win.document.querySelector('table');
                                if (printTable) {
                                    printTable.style.tableLayout = 'fixed';
                                    printTable.style.width = '100%';
                                    printTable.style.wordWrap = 'break-word';
                                    printTable.style.overflowWrap = 'break-word';
                                }
                            }
                        }
                    }
                ],
                dom: '<"dt4r-topbar"lfB><"dt4r-sub-topbar"ip>rt<"dt4r-sub-topbar"ip><"clear">'
            });

            // Insert "Fit To Page + Word Wrap" toggle button before the Columns button.
            // When active it constrains the table to the container width and enables word wrap,
            // which is also respected by the Print (CSS) and PDF export buttons.
            var dtButtons = container.querySelector('.dt-buttons');
            if (dtButtons) {
                var fitBtn = document.createElement('button');
                fitBtn.type = 'button';
                fitBtn.className = 'btn btn-default btn-xs';
                fitBtn.innerHTML = '<i class="fa fa-text-width"></i> Fit To Page + Word Wrap';
                fitBtn.title = 'Constrain table to page width and enable word wrap';
                dtButtons.insertBefore(fitBtn, dtButtons.firstChild);

                fitBtn.addEventListener('click', function () {
                    var activating = !table.classList.contains('dt4r-fitpage');
                    table.classList.toggle('dt4r-wrap');
                    table.classList.toggle('dt4r-fitpage');
                    fitBtn.classList.toggle('active');

                    // Removal of custom user resize when activating: Clear any inline widths set by column resize so that 
                    // table-layout:fixed can distribute columns evenly, and isnt overextended by previously set widths.
                    if (activating) {
                        table.style.tableLayout = '';
                        table.querySelectorAll('thead th').forEach(function (th) {
                            th.style.width = '';
                        });
                    }
                });

                // Insert "Export filtered data to" label before the first export button
                var firstExportBtn = dtButtons.querySelector('.dt4r-export-btn');
                if (firstExportBtn) {
                    var exportLabel = document.createElement('span');
                    exportLabel.className = 'dt4r-export-label';
                    exportLabel.textContent = 'Export filtered data to';
                    dtButtons.insertBefore(exportLabel, firstExportBtn);
                }
            }

            // Hide sidebar in DataTables view to maximize table space.
            // Sidebar is restored when switching back to original view.
            var sidebarCol = document.querySelector('.col-md-2.order-md-1');
            var mainCol = document.querySelector('.col-md-10.order-md-2');
            if (sidebarCol && mainCol) {
                sidebarCol.style.display = 'none';
                mainCol.classList.remove('col-md-10');
                mainCol.classList.add('col-md-12');
            }

            // Enable column resize via drag handles on <th> elements
            enableColumnResize(table);

            // Switch button to "back" state
            isActive = true;
            btn.disabled = false;
            btn.innerHTML = '<i class="fa fa-arrow-left"></i> Back to original view';
            btn.className = 'btn btn-default dt4r-btn dt4r-btn-active';

        }

        // =====================================================================================
        // COLUMN RESIZE — drag handles on table headers for manual size adjustment
        // -------------------------------------------------------------------------------------
        // TODO: Change to native DataTables Resize after Koha updates their DataTables version.
        // =====================================================================================
        function enableColumnResize(tableEl) {
            var resizeActive = false;  // becomes true after first resize (switches to table-layout:fixed)
            var dragHappened = false;   // true during a drag, used to suppress sort click

            // Capture-phase click handler on thead: intercept clicks that follow
            // a resize drag before DataTables interprets them as sort clicks
            tableEl.querySelector('thead').addEventListener('click', function (e) {
                if (dragHappened) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    dragHappened = false;
                }
            }, true);

            var ths = tableEl.querySelectorAll('thead th');
            ths.forEach(function (th, colIdx) {
                var handle = document.createElement('div');
                handle.className = 'dt4r-resize-handle';
                th.appendChild(handle);
                th.style.position = 'relative';

                var startX, startWidth;

                handle.addEventListener('mousedown', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    startX = e.pageX;
                    startWidth = th.offsetWidth;
                    dragHappened = false;

                    // On first resize: freeze all column widths and switch to fixed layout.
                    // This allows shrinking columns below their content width.
                    if (!resizeActive) {
                        tableEl.querySelectorAll('thead th').forEach(function (t) {
                            t.style.width = t.offsetWidth + 'px';
                        });
                        tableEl.style.tableLayout = 'fixed';
                        resizeActive = true;
                    }

                    var onMouseMove = function (e) {
                        dragHappened = true;
                        var newWidth = startWidth + (e.pageX - startX);
                        if (newWidth > 20) {
                            th.style.width = newWidth + 'px';
                            // Mark resized cells for CSS overflow handling
                            th.classList.add('dt4r-resized');
                            tableEl.querySelectorAll('tbody tr td:nth-child(' + (colIdx + 1) + ')')
                                .forEach(function (td) { td.classList.add('dt4r-resized'); });
                        }
                    };

                    var onMouseUp = function () {
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                    };

                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                });
            });
        }

        // ==================================================================================================================
        // RESTORE — simply reload the page to guarantee a clean state. This is the safest approach across all Koha versions.
        // The changes made in the DataTables view (hiding elements, adding classes) are all reverted on page reload, though.
        // But this approach ensures that we dont run into any edge cases where some elements remain hidden or styles remain 
        // after switching back and forth a few times. 
        // TODO: It is a minor inconvenience, but with a newer (and complete!) version of DataTables in Koha itself we could 
        // implement this very easily with the "StateRestore" extension: https://datatables.net/extensions/staterestore/
        // ==================================================================================================================
        function restoreOriginalView() {
            window.location.reload();
        }

        // =====================================================================
        // CSV PARSER — handles UTF-8 BOM, auto-detects delimiter, quoted fields
        // =====================================================================
        function parseCSV(text) {
            // Strip UTF-8 BOM if present
            if (text.charCodeAt(0) === 0xFEFF) text = text.substring(1);
            // Normalize line endings
            text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

            // Auto-detect delimiter by counting commas vs semicolons in the header line
            // If someone asks why this is necessary, dont we know what delimiter we get in Koha? Well, no. :-/
            // Koha's CSV export uses semicolons when the system language uses comma as decimal separator, and commas otherwise.
            var firstLine = text.split('\n')[0] || '';
            var commas = 0, semicolons = 0, inQ = false;
            for (var i = 0; i < firstLine.length; i++) {
                var ch = firstLine[i];
                if (ch === '"') inQ = !inQ;
                else if (!inQ) {
                    if (ch === ',') commas++;
                    if (ch === ';') semicolons++;
                }
            }
            var delim = semicolons > commas ? ';' : ',';

            // Parse fields character by character, respecting quoted fields and escaped quotes
            var rows = [], row = [], field = '', inQuotes = false;
            for (var i = 0; i < text.length; i++) {
                var ch = text[i];
                if (inQuotes) {
                    if (ch === '"') {
                        if (i + 1 < text.length && text[i + 1] === '"') {
                            field += '"';
                            i++;
                        } else {
                            inQuotes = false;
                        }
                    } else {
                        field += ch;
                    }
                } else if (ch === '"') {
                    inQuotes = true;
                } else if (ch === delim) {
                    row.push(field);
                    field = '';
                } else if (ch === '\n') {
                    row.push(field);
                    field = '';
                    if (row.length > 1 || row[0] !== '') rows.push(row);
                    row = [];
                } else {
                    field += ch;
                }
            }

            // Handle last field (file may or may not end with a newline)
            if (field || row.length > 0) {
                row.push(field);
                if (row.length > 1 || row[0] !== '') rows.push(row);
            }

            return rows;
        }
    }
})();
