(function() {
    "use strict";
    
    console.log('[DataTables Plugin] Loaded');
    
    // Nur auf Reports-Seiten aktivieren
    if (!window.location.pathname.includes('/reports/guided_reports.pl')) {
        return;
    }
    
    // Pruefe ob wir einen Report anzeigen (op=run)
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.get('id') || urlParams.get('op') !== 'run') {
        return;
    }
    
    // Warte bis DOM geladen ist
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initReportsDataTables);
    } else {
        initReportsDataTables();
    }
    
    function initReportsDataTables() {
        console.log('[DataTables Plugin] Checking report...');
        
        // Suche nach Report-Tabelle
        const reportTable = document.getElementById('report_results');
        if (!reportTable) {
            console.log('[DataTables Plugin] No report table found');
            return;
        }
        
        // Hole "Total number of results" aus dem Text
        const resultsText = document.body.innerText;
        const match = resultsText.match(/Total number of results:\s*(\d+)/i);
        
        if (!match) {
            console.log('[DataTables Plugin] Could not find total results count');
            return;
        }
        
        const totalResults = parseInt(match[1], 10);
        console.log('[DataTables Plugin] Total results:', totalResults);
        
        // Nur aktivieren wenn < 2000 Ergebnisse
        if (totalResults >= 2000) {
            console.log('[DataTables Plugin] Too many results (>= 2000), skipping DataTables');
            return;
        }
        
        console.log('[DataTables Plugin] Activating DataTables (< 2000 results)');
        
        // Pruefe ob DataTables verfuegbar ist
        if (typeof $.fn.dataTable === 'undefined') {
            console.log('[DataTables Plugin] Loading DataTables from CDN...');
            loadDataTablesFromCDN(reportTable, totalResults);
            return;
        }
        
        // Initialisiere DataTable
        initializeDataTable(reportTable, totalResults);
    }
    
    function loadDataTablesFromCDN(reportTable, totalResults) {
        // DataTables CSS laden
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://cdn.datatables.net/1.13.7/css/jquery.dataTables.min.css';
        document.head.appendChild(cssLink);
        
        // DataTables JS laden
        const script = document.createElement('script');
        script.src = 'https://cdn.datatables.net/1.13.7/js/jquery.dataTables.min.js';
        script.onload = function() {
            console.log('[DataTables Plugin] DataTables loaded from CDN');
            initializeDataTable(reportTable, totalResults);
        };
        script.onerror = function() {
            console.error('[DataTables Plugin] Failed to load DataTables from CDN');
        };
        document.head.appendChild(script);
    }
    
    function initializeDataTable(table, totalResults) {
        console.log('[DataTables Plugin] Initializing DataTable...');
        
        // Wenn Koha Pagination vorhanden ist, muessen wir alle Seiten laden
        const kohaPages = document.querySelector('.pages');
        const hasPagination = kohaPages !== null;
        
        if (hasPagination) {
            console.log('[DataTables Plugin] Koha pagination detected, loading all pages...');
            loadAllPagesAndInitialize(table, totalResults);
        } else {
            console.log('[DataTables Plugin] No pagination, all data already loaded');
            activateDataTable(table);
        }
    }
    
    function loadAllPagesAndInitialize(table, totalResults) {
        // Finde die aktuelle Report URL
        const currentUrl = new URL(window.location.href);
        const reportId = currentUrl.searchParams.get('id');
        
        // Berechne wie viele Seiten wir laden muessen (Koha Standard: 20 pro Seite)
        const rowsPerPage = 20;
        const totalPages = Math.ceil(totalResults / rowsPerPage);
        
        console.log('[DataTables Plugin] Loading ' + totalPages + ' pages...');
        
        // Zeige Loading-Indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border: 2px solid #5cb85c; border-radius: 5px; z-index: 10000; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
        loadingDiv.innerHTML = '<strong>Lade alle Daten fuer DataTables...</strong><br><span id="loading-progress">0/' + totalPages + ' Seiten</span>';
        document.body.appendChild(loadingDiv);
        
        // Sammle alle Zeilen
        const allRows = [];
        const tbody = table.querySelector('tbody');
        
        // Fuege existierende Zeilen hinzu
        tbody.querySelectorAll('tr').forEach(row => {
            allRows.push(row.cloneNode(true));
        });
        
        // Lade alle weiteren Seiten
        const promises = [];
        for (let page = 2; page <= totalPages; page++) {
            const pageUrl = new URL(window.location.href);
            pageUrl.searchParams.set('page', page);
            
            promises.push(
                fetch(pageUrl.href)
                    .then(response => response.text())
                    .then(html => {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(html, 'text/html');
                        const pageTable = doc.getElementById('report_results');
                        if (pageTable) {
                            const pageTbody = pageTable.querySelector('tbody');
                            if (pageTbody) {
                                pageTbody.querySelectorAll('tr').forEach(row => {
                                    allRows.push(row.cloneNode(true));
                                });
                            }
                        }
                        document.getElementById('loading-progress').textContent = 
                            allRows.length + ' Zeilen geladen...';
                    })
                    .catch(error => {
                        console.error('[DataTables Plugin] Error loading page ' + page + ':', error);
                    })
            );
        }
        
        // Warte bis alle Seiten geladen sind
        Promise.all(promises).then(() => {
            console.log('[DataTables Plugin] Loaded ' + allRows.length + ' total rows');
            
            // Ersetze tbody Inhalt mit allen Zeilen
            tbody.innerHTML = '';
            allRows.forEach(row => {
                tbody.appendChild(row);
            });
            
            // Entferne Loading-Indicator
            document.body.removeChild(loadingDiv);
            
            // Aktiviere DataTable
            activateDataTable(table);
        });
    }
    
    function activateDataTable(table) {
        console.log('[DataTables Plugin] Activating DataTable on table with all data...');
        
        // Verstecke/Entferne Koha UI-Elemente
        const kohaPages = document.querySelector('.pages');
        if (kohaPages) {
            kohaPages.style.display = 'none';
        }
        
        const paginationBottom = document.getElementById('pagination_bottom');
        if (paginationBottom) {
            paginationBottom.style.display = 'none';
        }
        
        const toolbar = document.getElementById('toolbar');
        if (toolbar) {
            // Pruefe ob "Show data menus" Button vorhanden ist
            const dataMenusBtn = toolbar.querySelector('button, a');
            const hasDataMenus = dataMenusBtn && dataMenusBtn.textContent.includes('data menu');
            
            if (!hasDataMenus) {
                // Kein Data Menus Button -> verstecke komplettes Toolbar
                toolbar.style.display = 'none';
            } else {
                // Behalte nur den Data Menus Button, entferne andere Elemente
                console.log('[DataTables Plugin] Keeping Show/Hide Data Menus button');
            }
        }
        
        // WICHTIG: Saebere die Tabelle gruendlich
        // 1. Pruefe thead
        const thead = table.querySelector('thead');
        if (thead) {
            const headerRows = thead.querySelectorAll('tr');
            console.log('[DataTables Plugin] Found ' + headerRows.length + ' header rows');
            
            if (headerRows.length > 1) {
                console.log('[DataTables Plugin] Removing extra header rows...');
                // Entferne alle ausser der ersten
                for (let i = headerRows.length - 1; i > 0; i--) {
                    headerRows[i].remove();
                }
            }
            
            // Entferne auch leere th-Elemente die Probleme machen koennten
            const firstRow = thead.querySelector('tr');
            if (firstRow) {
                const headers = firstRow.querySelectorAll('th');
                headers.forEach((th, index) => {
                    if (!th.textContent.trim() && index > 0) {
                        console.log('[DataTables Plugin] Found empty header at index ' + index);
                    }
                });
            }
        }
        
        // 2. Entferne tfoot falls vorhanden
        const tfoot = table.querySelector('tfoot');
        if (tfoot) {
            console.log('[DataTables Plugin] Removing tfoot');
            tfoot.remove();
        }
        
        // 3. Stelle sicher dass tbody existiert
        let tbody = table.querySelector('tbody');
        if (!tbody) {
            console.log('[DataTables Plugin] Creating tbody');
            tbody = document.createElement('tbody');
            table.appendChild(tbody);
        }
        
        try {
            $(table).DataTable({
                // Pagination
                pageLength: 25,
                lengthMenu: [[10, 25, 50, 100, 250, 500, -1], [10, 25, 50, 100, 250, 500, "Alle"]],
                
                // Features
                searching: true,
                ordering: true,
                info: true,
                deferRender: true,
                
                // Einfaches DOM Layout
                dom: 'lfrtip',
                
                // Sprache auf Deutsch
                language: {
                    "sEmptyTable": "Keine Daten in der Tabelle vorhanden",
                    "sInfo": "_START_ bis _END_ von _TOTAL_ Eintraegen",
                    "sInfoEmpty": "Keine Daten vorhanden",
                    "sInfoFiltered": "(gefiltert von _MAX_ Eintraegen)",
                    "sInfoPostFix": "",
                    "sInfoThousands": ".",
                    "sLengthMenu": "_MENU_ Eintraege anzeigen",
                    "sLoadingRecords": "Wird geladen...",
                    "sProcessing": "Bitte warten...",
                    "sSearch": "Suchen:",
                    "sZeroRecords": "Keine Eintraege vorhanden",
                    "oPaginate": {
                        "sFirst": "Erste",
                        "sPrevious": "Zurueck",
                        "sNext": "Naechste",
                        "sLast": "Letzte"
                    },
                    "oAria": {
                        "sSortAscending": ": aktivieren, um Spalte aufsteigend zu sortieren",
                        "sSortDescending": ": aktivieren, um Spalte absteigend zu sortieren"
                    }
                },
                
                // Styling
                autoWidth: false,
                scrollX: true,
                scrollCollapse: true
            });
            
            console.log('[DataTables Plugin] DataTable activated successfully!');
            
        } catch (error) {
            console.error('[DataTables Plugin] Error activating DataTable:', error);
            
            // Bei Fehler: Koha UI wieder anzeigen
            if (kohaPages) {
                kohaPages.style.display = '';
            }
            if (paginationBottom) {
                paginationBottom.style.display = '';
            }
            if (toolbar) {
                toolbar.style.display = '';
            }
        }
    }
})();
